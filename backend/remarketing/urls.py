from django.urls import path

from .views import BatchValuationView, DepreciationForecastView, ValuateAssetView

urlpatterns = [
    path("valuate/", ValuateAssetView.as_view(), name="remarketing-valuate"),
    path("batch-valuations/", BatchValuationView.as_view(), name="remarketing-batch"),
    path("depreciation-forecast/", DepreciationForecastView.as_view(), name="remarketing-forecast"),
]
