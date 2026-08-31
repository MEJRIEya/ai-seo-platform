"""add audits table

Revision ID: 1d53ebc537e0
Revises: f9a62125f034
Create Date: 2026-08-26 22:42:51.409857

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1d53ebc537e0'
down_revision: Union[str, Sequence[str], None] = 'f9a62125f034'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("sites", "google_account_id", existing_type=sa.UUID(), nullable=True)
    op.alter_column("sites", "gsc_property_url", existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    op.alter_column("sites", "gsc_property_url", existing_type=sa.String(), nullable=False)
    op.alter_column("sites", "google_account_id", existing_type=sa.UUID(), nullable=False)