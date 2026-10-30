from decimal import Decimal
from dateutil.relativedelta import relativedelta
from datetime import timedelta


def calculate_maturity_date(start_date, tenure_value, tenure_unit):
    if tenure_unit == "DAYS":
        return start_date + timedelta(days=tenure_value)
    elif tenure_unit == "MONTHS":
        return start_date + relativedelta(months=tenure_value)
    elif tenure_unit == "YEARS":
        return start_date + relativedelta(years=tenure_value)
    return start_date


def calculate_maturity_amount(principal, rate, tenure_value, tenure_unit, interest_type, compounding_frequency):
    """
    Returns maturity amount
    """
    principal = Decimal(principal)
    rate = Decimal(rate) / Decimal(100)

    # Convert tenure to years
    if tenure_unit == "DAYS":
        years = Decimal(tenure_value) / Decimal(365)
    elif tenure_unit == "MONTHS":
        years = Decimal(tenure_value) / Decimal(12)
    else:
        years = Decimal(tenure_value)

    if interest_type == "SIMPLE":
        interest = principal * rate * years
        return (principal + interest).quantize(Decimal("0.01"))

    # Compound Interest
    freq_map = {
        "MONTHLY": 12,
        "QUARTERLY": 4,
        "HALF_YEARLY": 2,
        "YEARLY": 1,
    }
    n = freq_map.get(compounding_frequency, 4)
    amount = principal * ((1 + rate / n) ** (n * years))
    return amount.quantize(Decimal("0.01"))