"""add user profile fields

Revision ID: a6f12c9d4e31
Revises: c0ceceae77e0
Create Date: 2026-10-25

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a6f12c9d4e31"
down_revision: Union[str, Sequence[str], None] = "c0ceceae77e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("position", sa.String(), nullable=True))
    op.add_column("users", sa.Column("start_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "start_date")
    op.drop_column("users", "position")
