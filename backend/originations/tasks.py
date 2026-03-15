import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def analyze_contract_document(analysis_id: int):
    """
    Parse an uploaded lease document (PDF) and validate extracted fields
    against the stored LeaseContract data.

    Uses pdfminer.six for text extraction (no external API needed).
    Add ANTHROPIC_API_KEY to .env to enable Claude-powered extraction.
    """
    from .models import ContractAnalysis

    try:
        analysis = ContractAnalysis.objects.select_related("lease").get(pk=analysis_id)
    except ContractAnalysis.DoesNotExist:
        return

    analysis.status = "processing"
    analysis.save(update_fields=["status"])

    lease = analysis.lease

    try:
        text, pages = _extract_pdf_text(lease.document)
        analysis.pages_analyzed = pages

        extracted = _parse_contract_fields(text, lease)
        issues = _validate_against_lease(extracted, lease)

        # Simple heuristic confidence: penalise for each missing/mismatched field
        matched = sum(1 for i in issues if i["severity"] == "info")
        total = len(extracted) or 1
        confidence = max(0.0, min(1.0, 1.0 - len([i for i in issues if i["severity"] in ("warning", "error")]) * 0.15))

        analysis.extracted_data = extracted
        analysis.validation_issues = issues
        analysis.confidence_score = round(confidence, 2)
        analysis.status = "completed"
        analysis.analyzed_at = timezone.now()
        analysis.save(update_fields=[
            "extracted_data", "validation_issues", "confidence_score",
            "status", "analyzed_at", "pages_analyzed",
        ])

    except Exception as exc:
        logger.exception("Contract analysis failed for analysis %s: %s", analysis_id, exc)
        analysis.status = "failed"
        analysis.error_message = str(exc)[:500]
        analysis.save(update_fields=["status", "error_message"])


def _extract_pdf_text(document_field) -> tuple[str, int]:
    """Extract text from a PDF FileField using pdfminer.six."""
    try:
        import io
        from pdfminer.high_level import extract_text_to_fp
        from pdfminer.layout import LAParams
        from pdfminer.pdfpage import PDFPage

        document_field.open("rb")
        raw = document_field.read()
        document_field.close()

        # Count pages
        pages = 0
        with io.BytesIO(raw) as f:
            for _ in PDFPage.get_pages(f):
                pages += 1

        # Extract text
        output = io.StringIO()
        with io.BytesIO(raw) as f:
            extract_text_to_fp(f, output, laparams=LAParams())
        text = output.getvalue()
        return text, pages

    except ImportError:
        # pdfminer not installed — return empty stub
        logger.warning("pdfminer.six not installed; returning empty extraction")
        return "", 0


def _parse_contract_fields(text: str, lease) -> dict:
    """Heuristic regex extraction of key contract fields from raw text."""
    import re

    extracted: dict = {}
    text_lower = text.lower()

    # Contract number
    m = re.search(r"(lc-[a-f0-9]{8}|contract\s*#?\s*:?\s*(lc-\w+))", text, re.IGNORECASE)
    if m:
        extracted["contract_number"] = m.group(0).strip()

    # Dates (ISO format)
    dates = re.findall(r"\b(\d{4}-\d{2}-\d{2})\b", text)
    if dates:
        extracted["dates_found"] = dates[:6]

    # Monetary amounts
    amounts = re.findall(r"\$\s?([\d,]+(?:\.\d{2})?)", text)
    if amounts:
        extracted["amounts_found"] = amounts[:8]

    # Lessee name
    m = re.search(r"(?:lessee|customer|tenant)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)", text)
    if m:
        extracted["lessee_name"] = m.group(1).strip()

    # Asset description
    m = re.search(r"(?:asset|equipment)[:\s]+([^\n]{5,60})", text, re.IGNORECASE)
    if m:
        extracted["asset_description"] = m.group(1).strip()

    # Monthly fee
    m = re.search(r"(?:monthly\s+(?:fee|rate|payment))[:\s]+\$?\s?([\d,]+(?:\.\d{2})?)", text, re.IGNORECASE)
    if m:
        extracted["monthly_fee"] = m.group(1).replace(",", "")

    return extracted


def _validate_against_lease(extracted: dict, lease) -> list:
    """Compare extracted data against stored lease fields."""
    issues = []

    # Check contract number match
    if "contract_number" in extracted:
        if lease.contract_number.lower() not in extracted["contract_number"].lower():
            issues.append({
                "field": "contract_number",
                "stored": lease.contract_number,
                "extracted": extracted["contract_number"],
                "severity": "warning",
                "message": "Contract number in document may not match stored value.",
            })
        else:
            issues.append({
                "field": "contract_number",
                "stored": lease.contract_number,
                "extracted": extracted["contract_number"],
                "severity": "info",
                "message": "Contract number matched.",
            })

    # Check dates
    if "dates_found" in extracted:
        start_str = lease.start_date.isoformat()
        end_str = lease.end_date.isoformat()
        if start_str not in extracted["dates_found"]:
            issues.append({
                "field": "start_date",
                "stored": start_str,
                "extracted": extracted["dates_found"],
                "severity": "warning",
                "message": "Start date not found in document.",
            })
        if end_str not in extracted["dates_found"]:
            issues.append({
                "field": "end_date",
                "stored": end_str,
                "extracted": extracted["dates_found"],
                "severity": "warning",
                "message": "End date not found in document.",
            })

    # Check monthly fee
    if "monthly_fee" in extracted:
        try:
            doc_fee = float(extracted["monthly_fee"].replace(",", ""))
            stored_fee = float(lease.monthly_base_fee)
            if abs(doc_fee - stored_fee) > 1.0:
                issues.append({
                    "field": "monthly_fee",
                    "stored": str(stored_fee),
                    "extracted": str(doc_fee),
                    "severity": "error",
                    "message": f"Monthly fee mismatch: document shows ${doc_fee:,.2f}, stored is ${stored_fee:,.2f}.",
                })
            else:
                issues.append({
                    "field": "monthly_fee",
                    "stored": str(stored_fee),
                    "extracted": str(doc_fee),
                    "severity": "info",
                    "message": "Monthly fee matched.",
                })
        except (ValueError, TypeError):
            pass

    return issues
