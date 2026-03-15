"""
Groq LLM integration for AssetStream AI chat.
Builds live portfolio context, calls Groq API, falls back to keyword engine.
"""
import json
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"


def _get_portfolio_context() -> str:
    """Pull live snapshot from DB and format as context string for LLM."""
    try:
        from django.db.models import Count, Sum
        from originations.models import Asset, LeaseContract
        from servicing.models import Invoice

        # Fleet
        total_assets = Asset.objects.count()
        by_status = {
            r["status"]: r["c"]
            for r in Asset.objects.values("status").annotate(c=Count("id"))
        }
        leased = by_status.get("leased", 0)
        available = by_status.get("available", 0)
        maintenance = by_status.get("maintenance", 0)

        # Leases
        active_leases = LeaseContract.objects.filter(status="active").count()
        arr = float(
            LeaseContract.objects.filter(status="active")
            .aggregate(s=Sum("monthly_base_fee"))["s"] or 0
        )

        # Invoices
        overdue_count = Invoice.objects.filter(status="overdue").count()
        overdue_amount = float(
            Invoice.objects.filter(status="overdue").aggregate(s=Sum("total_amount"))["s"] or 0
        )
        paid_amount = float(
            Invoice.objects.filter(status="paid").aggregate(s=Sum("total_amount"))["s"] or 0
        )
        outstanding = float(
            Invoice.objects.filter(status__in=["issued", "overdue"])
            .aggregate(s=Sum("total_amount"))["s"] or 0
        )
        collection_rate = (
            round(paid_amount / (paid_amount + outstanding) * 100, 1)
            if (paid_amount + outstanding) > 0 else 0.0
        )

        # Risk scores
        try:
            from ai_engine.models import RiskScore
            high_risk = RiskScore.objects.filter(risk_band__in=["high", "critical"]).count()
            total_scored = RiskScore.objects.count()
        except Exception:
            high_risk = 0
            total_scored = 0

        # Maintenance predictions
        try:
            from ai_engine.models import MaintenancePrediction
            critical_maintenance = MaintenancePrediction.objects.filter(risk_level="critical").count()
        except Exception:
            critical_maintenance = 0

        return f"""
LIVE PORTFOLIO SNAPSHOT (as of now):
- Fleet: {total_assets} total assets ({leased} leased, {available} available, {maintenance} in maintenance)
- Active lease contracts: {active_leases}
- Monthly Recurring Revenue (MRR/ARR): ${arr:,.2f}/month
- Overdue invoices: {overdue_count} invoices totalling ${overdue_amount:,.2f}
- Total collected revenue: ${paid_amount:,.2f}
- Outstanding receivables: ${outstanding:,.2f}
- Collection rate: {collection_rate}%
- High/Critical risk leases: {high_risk} of {total_scored} scored
- Assets needing critical maintenance: {critical_maintenance}
"""
    except Exception as e:
        logger.warning(f"Failed to fetch portfolio context: {e}")
        return "\n(Live portfolio data unavailable — answer based on general knowledge.)\n"


def build_system_prompt() -> str:
    portfolio_ctx = _get_portfolio_context()
    return f"""You are **Aria**, AssetStream's intelligent AI Portfolio Analyst — a world-class financial and operational AI built specifically for Equipment-as-a-Service (XaaS) asset finance.

PLATFORM CONTEXT:
AssetStream manages a fleet of leased industrial assets across categories: Heavy Equipment, Medical, Fleet, and Industrial. The platform tracks asset utilization, lease contracts, invoices, maintenance health, risk scores, and remarketing recommendations.

{portfolio_ctx}

YOUR CAPABILITIES:
- Deep analysis of portfolio health, revenue trends, cash flow, and risk exposure
- Identifying overdue invoice patterns and recommending collections actions
- Predicting maintenance failures and prioritizing servicing schedules
- Evaluating lease renewal risk and churn probability
- Assessing remarketing opportunities (sell, re-lease, refurbish)
- Scenario modeling (rate changes, fleet expansion, utilization shifts)
- Generating actionable recommendations backed by data

RESPONSE STYLE:
- Be concise, sharp, and confident — like a senior finance analyst
- Use **bold** for key numbers and metrics
- Use bullet points for lists and recommendations
- Lead with the most important insight, then support with data
- When you cite figures, they come from the live portfolio snapshot above
- If asked something outside your domain, redirect gracefully to portfolio topics
- Keep responses focused (3-6 sentences for simple questions, more for complex analysis)
- Never make up specific numbers — if data is unavailable, say so clearly

You are conversational, precise, and exceptionally capable. Users trust you with their most important financial decisions."""


def call_groq(
    user_message: str,
    conversation_history: list[dict],
    system_prompt: str | None = None,
) -> str:
    """
    Call Groq API with the given message and conversation history.
    Returns the assistant's text response.
    Raises on failure so caller can fall back.
    """
    api_key = getattr(settings, "GROQ_API_KEY", "")
    model = getattr(settings, "GROQ_MODEL", "qwen/qwen3-32b")

    if not api_key:
        raise ValueError("GROQ_API_KEY not configured")

    if system_prompt is None:
        system_prompt = build_system_prompt()

    messages = [{"role": "system", "content": system_prompt}]
    # Include recent conversation history (last 12 messages for context)
    messages.extend(conversation_history[-12:])
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1024,
        "stream": False,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    response = requests.post(
        GROQ_ENDPOINT,
        headers=headers,
        json=payload,
        timeout=30,
    )
    response.raise_for_status()

    data = response.json()
    content = data["choices"][0]["message"]["content"]

    # Strip Qwen3 chain-of-thought block (<think>...</think>) before returning
    import re
    content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()

    return content
