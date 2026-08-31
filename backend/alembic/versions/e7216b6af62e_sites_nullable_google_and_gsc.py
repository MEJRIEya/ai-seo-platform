"""sites_nullable_google_and_gsc

Revision ID: e7216b6af62e
Revises: 2bc5957e7be2
Create Date: 2026-08-27 18:50:47.784441

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7216b6af62e'
down_revision: Union[str, Sequence[str], None] = '2bc5957e7be2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
