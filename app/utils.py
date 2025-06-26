import random

from .constants import user_names

def generate_random_name():
    return random.choice(user_names)