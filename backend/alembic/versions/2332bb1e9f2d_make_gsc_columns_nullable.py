"""make gsc columns nullable

Revision ID: 2332bb1e9f2d
Revises: c7865669313f
Create Date: 2026-07-27 12:32:42.190516

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2332bb1e9f2d'
down_revision: Union[str, Sequence[str], None] = 'c7865669313f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('seo_metrics', 'clicks', existing_type=sa.INTEGER(), nullable=True)
    op.alter_column('seo_metrics', 'impressions', existing_type=sa.INTEGER(), nullable=True)
    op.alter_column('seo_metrics', 'position', existing_type=sa.NUMERIC(), nullable=True)
    op.alter_column('seo_metrics', 'ctr', existing_type=sa.NUMERIC(), nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('seo_metrics', 'clicks', existing_type=sa.INTEGER(), nullable=False)
    op.alter_column('seo_metrics', 'impressions', existing_type=sa.INTEGER(), nullable=False)
    op.alter_column('seo_metrics', 'position', existing_type=sa.NUMERIC(), nullable=False)
    op.alter_column('seo_metrics', 'ctr', existing_type=sa.NUMERIC(), nullable=False)