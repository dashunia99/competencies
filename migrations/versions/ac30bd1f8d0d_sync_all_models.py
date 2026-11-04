"""sync_all_models

Revision ID: ac30bd1f8d0d
Revises: c0ceceae77e0
Create Date: 2026-10-27 14:31:37.434734

"""
from typing import Sequence, Union

# Revision identifiers, used by Alembic.
revision: str = 'ac30bd1f8d0d'
down_revision: Union[str, Sequence[str], None] = 'c0ceceae77e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The password_hash migration is already applied in c0ceceae77e0.
    pass


def downgrade() -> None:
    pass
