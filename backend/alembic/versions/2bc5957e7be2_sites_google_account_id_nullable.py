"""sites_google_account_id_nullable

Revision ID: 2bc5957e7be2
Revises: 939f5e3f7cd5
Create Date: 2026-08-27 18:50:25.720170

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2bc5957e7be2'
down_revision: Union[str, Sequence[str], None] = '939f5e3f7cd5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
