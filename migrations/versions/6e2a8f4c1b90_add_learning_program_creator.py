"""add learning program creator

Revision ID: 6e2a8f4c1b90
Revises: f4c8a1d7e2b3
Create Date: 2026-11-03

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "6e2a8f4c1b90"
down_revision: Union[str, Sequence[str], None] = "f4c8a1d7e2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "learning_programs",
        sa.Column("creator_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_learning_programs_creator_id",
        "learning_programs",
        "users",
        ["creator_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_learning_programs_creator_id",
        "learning_programs",
        type_="foreignkey",
    )
    op.drop_column("learning_programs", "creator_id")
