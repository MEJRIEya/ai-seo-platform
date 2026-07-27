"""remove composite primary key on seo_metrics

Revision ID: 1074bc6b4e8d
Revises: b709cd111c61
Create Date: 2026-07-20 21:17:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '1074bc6b4e8d'
down_revision = 'b709cd111c61'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE seo_metrics DROP CONSTRAINT seo_metrics_pkey;")


def downgrade():
    op.execute("ALTER TABLE seo_metrics ADD PRIMARY KEY (time, site_id);")