#!/usr/bin/env python3
"""
debug_structure.py
Inspect the structure of your Instagram JSON files to diagnose parsing issues.

Usage:
  python debug_structure.py followers.json following.json
"""

import json
import sys


def inspect_file(filepath):
    """Print structural info about a JSON file."""
    print(f"\n{'='*60}")
    print(f"File: {filepath}")
    print(f"{'='*60}")

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"ERROR reading file: {e}")
        return

    print(f"Root type: {type(data).__name__}")

    if isinstance(data, dict):
        print(f"Root keys: {list(data.keys())}")
        for key in data.keys():
            val = data[key]
            print(f"  - {key}: {type(val).__name__}", end="")
            if isinstance(val, list):
                print(f" (length: {len(val)})")
                if val and isinstance(val[0], dict):
                    print(f"    First item keys: {list(val[0].keys())}")
                    if "string_list_data" in val[0]:
                        sld = val[0]["string_list_data"]
                        if sld and isinstance(sld[0], dict):
                            print(f"    First string_list_data[0] keys: {list(sld[0].keys())}")
                            if "value" in sld[0]:
                                print(f"    Example value: '{sld[0]['value']}'")
            else:
                print()

    elif isinstance(data, list):
        print(f"Root list length: {len(data)}")
        if data and isinstance(data[0], dict):
            print(f"  First item keys: {list(data[0].keys())}")
            if "string_list_data" in data[0]:
                sld = data[0]["string_list_data"]
                if sld and isinstance(sld[0], dict):
                    print(f"  string_list_data[0] keys: {list(sld[0].keys())}")
                    if "value" in sld[0]:
                        print(f"  Example value: '{sld[0]['value']}'")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python debug_structure.py <followers.json> <following.json>")
        sys.exit(1)

    for filepath in sys.argv[1:]:
        inspect_file(filepath)

    print(f"\n{'='*60}\n")
