from decimal import Decimal
from dateutil.relativedelta import relativedelta
from datetime import date


def calculate_rd_maturity_date(start_date, tenure_months):
    return start_date + relativedelta(months=tenure_months)


def calculate_rd_maturity_amount(monthly_instalment, tenure_months, annual_rate, interest_type="COMPOUND"):
    """
    Approximate maturity value for RD.
    For compound: standard RD formula
    M = P * (((1+r)^n - 1) / r) * (1+r)
    where r = monthly rate, n = months
    """
    P = Decimal(monthly_instalment)
    n = Decimal(tenure_months)
    annual = Decimal(annual_rate) / Decimal(100)

    if interest_type == "SIMPLE":
        # Simple approximation
        total_principal = P * n
        avg_months = (n + 1) / 2
        interest = total_principal * annual * (avg_months / 12)
        return (total_principal + interest).quantize(Decimal("0.01"))

    # Compound monthly
    r = annual / Decimal(12)
    if r == 0:
        return (P * n).quantize(Decimal("0.01"))

    maturity = P * (((1 + r) ** n - 1) / r) * (1 + r)
    return maturity.quantize(Decimal("0.01"))


def generate_instalment_schedule(rd_account):
    """Create instalment rows after account is approved/activated."""
    from .models import RDInstalment

    product = rd_account.product
    due_day = min(product.monthly_due_day, 28)

    instalments = []
    for i in range(1, rd_account.tenure_months + 1):
        due_date = rd_account.start_date + relativedelta(months=i)
        # force due day
        try:
            due_date = due_date.replace(day=due_day)
        except ValueError:
            pass

        instalments.append(
            RDInstalment(
                rd_account=rd_account,
                instalment_number=i,
                due_date=due_date,
                amount_due=rd_account.monthly_instalment,
                status="DUE",
            )
        )

    RDInstalment.objects.bulk_create(instalments)