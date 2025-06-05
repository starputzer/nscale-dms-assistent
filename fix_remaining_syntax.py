#!/usr/bin/env python3
"""Fix remaining syntax errors"""

import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Fix 1: Remove duplicate exception raising
    content = re.sub(
        r'raise HTTPException\(status_code=500, detail=str\(e\)\)\(status_code=500, detail=str\(e\)\)',
        'raise HTTPException(status_code=500, detail=str(e))',
        content
    )
    
    # Fix 2: Fix missing closing braces in JSON returns
    content = re.sub(
        r'(return \{[^}]+)"([^}]+)$',
        r'\1"\2}',
        content,
        flags=re.MULTILINE
    )
    
    # Fix 3: Fix broken indentation in specific patterns
    if 'missing_endpoints.py' in filepath:
        # Fix the get_current_user function
        content = re.sub(
            r'if row:\s*\n\s*return \{',
            'if row:\n            return {',
            content
        )
        
        # Fix missing closing braces
        content = re.sub(
            r'"batch_processing": True\s*\n\s*}\s*\n\n@router',
            '"batch_processing": True\n        }\n    }\n\n@router',
            content
        )
        
        content = re.sub(
            r'"cache": "operational"\s*\n\s*}\s*\n\n@router',
            '"cache": "operational"\n        }\n    }\n\n@router',
            content
        )
        
        content = re.sub(
            r'"generation_time": 0\.7\s*\n\s*}\s*\n\n@router',
            '"generation_time": 0.7\n        }\n    }\n\n@router',
            content
        )
        
        content = re.sub(
            r'"disk_usage": 45\.0\s*\n\s*}\s*\n\n@router',
            '"disk_usage": 45.0\n        }\n    }\n\n@router',
            content
        )
        
        content = re.sub(
            r'"user_satisfaction": 4\.2\s*\n\s*}\s*\n\n@router',
            '"user_satisfaction": 4.2\n        }\n    }\n\n@router',
            content
        )
        
        content = re.sub(
            r'"1": 2\s*\n\s*}\s*\n\n@router',
            '"1": 2\n        }\n    }\n\n@router',
            content
        )
    
    # Fix 4: Fix admin_users_endpoints specific issues
    if 'admin_users' in filepath:
        # Fix params.append indentation
        content = re.sub(
            r'if role:\s*\n\s*query \+= " AND role = \?"\s*\n\s*params\.append',
            'if role:\n                query += " AND role = ?"\n                params.append',
            content
        )
        
        content = re.sub(
            r'if is_active is not None:\s*\n\s*query \+= " AND is_active = \?"\s*\n\s*params\.append',
            'if is_active is not None:\n                query += " AND is_active = ?"\n                params.append',
            content
        )
        
        content = re.sub(
            r'if search:\s*\n\s*query \+= " AND \(email LIKE \? OR username LIKE \?\)"\s*\n\s*params\.extend',
            'if search:\n                query += " AND (email LIKE ? OR username LIKE ?)"\n                params.extend',
            content
        )
        
        # Fix nested cursor.execute
        content = re.sub(
            r'for row in rows:\s*\n\s*# Get session count for user\s*\n\s*cursor\.execute\(',
            'for row in rows:\n                # Get session count for user\n                cursor.execute(',
            content
        )
        
        # Fix user append
        content = re.sub(
            r'session_count = cursor\.fetchone\(\)\[0\]\s*\n\s*\n\s*users\.append',
            'session_count = cursor.fetchone()[0]\n                \n                users.append',
            content
        )
        
        # Fix raise HTTPException in get_user
        content = re.sub(
            r'row = cursor\.fetchone\(\)\s*\n\s*if not row:\s*\n\s*raise HTTPException',
            'row = cursor.fetchone()\n            if not row:\n                raise HTTPException',
            content
        )
        
        # Fix raise HTTPException for admin deletion
        content = re.sub(
            r'if row\[\'role\'\] == \'admin\':\s*\n\s*raise HTTPException',
            'if row[\'role\'] == \'admin\':\n                raise HTTPException',
            content
        )
    
    # Fix 5: Fix admin_feedback_endpoints
    if 'admin_feedback' in filepath:
        # Fix nested if statements
        content = re.sub(
            r'if filter_params:\s*\n\s*if filter_params\.date_from:\s*\n\s*query',
            'if filter_params:\n            if filter_params.date_from:\n                query',
            content
        )
        
        # Fix params append
        content = re.sub(
            r'query \+= " AND f\.created_at >= \?"\s*\n\s*params\.append',
            'query += " AND f.created_at >= ?"\n                params.append',
            content
        )
        
        content = re.sub(
            r'query \+= " AND f\.created_at <= \?"\s*\n\s*params\.append',
            'query += " AND f.created_at <= ?"\n                params.append',
            content
        )
        
        # Fix date loop
        content = re.sub(
            r'for i in range\(7\):\s*\n\s*date = now',
            'for i in range(7):\n                date = now',
            content
        )
        
        # Fix nested cursor execute
        content = re.sub(
            r'date = now - timedelta\(days=i\)\s*\n\s*start_ts',
            'date = now - timedelta(days=i)\n                start_ts',
            content
        )
        
        # Fix feedback_by_day append
        content = re.sub(
            r'row = cursor\.fetchone\(\)\s*\n\s*feedback_by_day\.append',
            'row = cursor.fetchone()\n                feedback_by_day.append',
            content
        )
    
    # Fix 6: Fix statistics endpoints
    if 'statistics' in filepath:
        # Fix multi-line SQL queries - keep them properly indented
        content = re.sub(
            r'cursor\.execute\("""\s*\n\s*([^"]+)\s*\n\s*([^"]+)\s*\n\s*([^"]+)\s*\n\s*""", \((.*?)\)\)',
            lambda m: f'cursor.execute("""\n                {m.group(1).strip()}\n                {m.group(2).strip()}\n                {m.group(3).strip()}\n            """, ({m.group(4)}))',
            content,
            flags=re.MULTILINE
        )
    
    # Fix 7: Fix dashboard endpoints
    if 'dashboard' in filepath:
        # Nothing specific yet
        pass
    
    # Fix 8: Fix system endpoints  
    if 'system' in filepath:
        # Fix RAG metrics return
        content = re.sub(
            r'except Exception as e:\s*\n\s*logger\.error\(f"Error getting RAG metrics: \{e\}"\)\s*\n\s*# Return default values on error\s*\n\s*return RAGMetrics',
            'except Exception as e:\n        logger.error(f"Error getting RAG metrics: {e}")\n        # Return default values on error\n        return RAGMetrics',
            content
        )
    
    # Clean up file
    content = re.sub(r'\n\n\n+', '\n\n', content)
    
    if not content.endswith('\n'):
        content += '\n'
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"Fixed {filepath}")

# Fix all files
files = [
    'api/missing_endpoints.py',
    'api/admin_users_endpoints.py',
    'api/admin_feedback_endpoints.py',
    'api/admin_statistics_endpoints.py',
    'api/admin_dashboard_endpoints.py',
    'api/admin_system_endpoints.py'
]

for file in files:
    fix_file(file)