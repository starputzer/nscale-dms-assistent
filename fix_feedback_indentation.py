#!/usr/bin/env python3
"""Fix all indentation issues in admin_feedback_endpoints.py"""

with open('api/admin_feedback_endpoints.py', 'r') as f:
    content = f.read()

# Replace the problematic section with correctly indented code
old_section = """        if filter_params:
            if filter_params.date_from:
                query += " AND f.created_at >= ?"
                params.append(filter_params.date_from)
        
            if filter_params.date_to:
            query += " AND f.created_at <= ?"
            params.append(filter_params.date_to)
        
            if filter_params.is_positive is not None:
            query += " AND f.is_positive = ?"
            params.append(1 if filter_params.is_positive else 0)
        
            if filter_params.has_comment is not None:
            if filter_params.has_comment:
                query += " AND f.comment IS NOT NULL AND f.comment != ''"
            else:
                query += " AND (f.comment IS NULL OR f.comment = '')"
        
            if filter_params.search_term:
            query += " AND (f.question LIKE ? OR f.answer LIKE ? OR f.comment LIKE ? OR u.email LIKE ?)"
            search_pattern = f"%{filter_params.search_term}%"
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern])
        
        if filter_params.status:
            query += " AND f.status = ?"
            params.append(filter_params.status)"""

new_section = """        if filter_params:
            if filter_params.date_from:
                query += " AND f.created_at >= ?"
                params.append(filter_params.date_from)
        
            if filter_params.date_to:
                query += " AND f.created_at <= ?"
                params.append(filter_params.date_to)
        
            if filter_params.is_positive is not None:
                query += " AND f.is_positive = ?"
                params.append(1 if filter_params.is_positive else 0)
        
            if filter_params.has_comment is not None:
                if filter_params.has_comment:
                    query += " AND f.comment IS NOT NULL AND f.comment != ''"
                else:
                    query += " AND (f.comment IS NULL OR f.comment = '')"
        
            if filter_params.search_term:
                query += " AND (f.question LIKE ? OR f.answer LIKE ? OR f.comment LIKE ? OR u.email LIKE ?)"
                search_pattern = f"%{filter_params.search_term}%"
                params.extend([search_pattern, search_pattern, search_pattern, search_pattern])
        
            if filter_params.status:
                query += " AND f.status = ?"
                params.append(filter_params.status)"""

content = content.replace(old_section, new_section)

with open('api/admin_feedback_endpoints.py', 'w') as f:
    f.write(content)

print("Fixed indentation issues")