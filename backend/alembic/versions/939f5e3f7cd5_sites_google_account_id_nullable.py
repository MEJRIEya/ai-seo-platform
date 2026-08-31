"""sites_google_account_id_nullable

Revision ID: 939f5e3f7cd5
Revises: 1d53ebc537e0
Create Date: 2026-08-27 18:48:27.572685

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '939f5e3f7cd5'
down_revision: Union[str, Sequence[str], None] = '1d53ebc537e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
