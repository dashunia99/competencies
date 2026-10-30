"""rename users.password to users.password_hash

Revision ID: c0ceceae77e0
Revises: 74bdac108d3d
Create Date: 2026-10-21 23:24:18.309865

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c0ceceae77e0'
down_revision: Union[str, Sequence[str], None] = '74bdac108d3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename the column without losing existing password hashes."""
    op.alter_column(
        "users",
        "password",
        existing_type=sa.String(),
        existing_nullable=False,
        new_column_name="password_hash",
    )


def downgrade() -> None:
    """Restore the original column name."""
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(),
        existing_nullable=False,
        new_column_name="password",
    )
