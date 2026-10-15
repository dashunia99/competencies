"""change_user_stack_relation

Revision ID: 067d88ccb14c
Revises: 459bd0c06ec1
Create Date: 2026-10-15 10:54:46.196708

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '067d88ccb14c'
down_revision: Union[str, Sequence[str], None] = '459bd0c06ec1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('user_stacks')
    op.add_column('users', sa.Column('stack_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
    'fk_users_stack_id',
    'users',
    'stacks',
    ['stack_id'],
    ['id'],
    ondelete='SET NULL'
)


def downgrade() -> None:
    op.drop_constraint('fk_users_stack_id', 'users', type_='foreignkey')
    op.drop_column('users', 'stack_id')
    op.create_table(
    'user_stacks',
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('stack_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['stack_id'], ['stacks.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('user_id', 'stack_id')
)

