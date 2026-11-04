"""merge role and audit schema heads

Revision ID: 9d2b910f49c6
Revises: b7e91f4d0c22, ef25661eb74e
Create Date: 2026-11-01 14:27:45.329519

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d2b910f49c6'
down_revision: Union[str, Sequence[str], None] = ('b7e91f4d0c22', 'ef25661eb74e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
