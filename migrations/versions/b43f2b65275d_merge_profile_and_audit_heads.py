"""merge profile and audit migration branches

Revision ID: b43f2b65275d
Revises: a6f12c9d4e31, ef25661eb74e
Create Date: 2026-10-30

"""

from typing import Sequence, Union


revision: str = "b43f2b65275d"
down_revision: Union[str, Sequence[str], None] = (
    "a6f12c9d4e31",
    "ef25661eb74e",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
