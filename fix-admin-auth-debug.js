#!/usr/bin/env node

/**
 * Debug script to check and fix admin authentication issues
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../data/db/users.db');

console.log('🔍 Admin Authentication Debug Script');
console.log('====================================\n');

// Open database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to users database\n');
});

// Check all users and their roles
db.all("SELECT id, email, username, role, created_at FROM users ORDER BY id", [], (err, rows) => {
    if (err) {
        console.error('❌ Error querying users:', err.message);
        db.close();
        return;
    }

    console.log('📋 Current Users:');
    console.log('================');
    
    if (rows.length === 0) {
        console.log('No users found in database!\n');
    } else {
        rows.forEach(user => {
            console.log(`ID: ${user.id}`);
            console.log(`Email: ${user.email}`);
            console.log(`Username: ${user.username || 'N/A'}`);
            console.log(`Role: ${user.role} ${user.role === 'admin' ? '👑' : ''}`);
            console.log(`Created: ${new Date(user.created_at).toLocaleString()}`);
            console.log('---');
        });
    }

    // Check if martin@danglefeet.com has admin role
    const martinUser = rows.find(u => u.email === 'martin@danglefeet.com');
    if (martinUser) {
        console.log('\n🔍 Martin User Status:');
        if (martinUser.role === 'admin') {
            console.log('✅ martin@danglefeet.com has admin role');
        } else {
            console.log(`⚠️  martin@danglefeet.com has role: ${martinUser.role}`);
            console.log('   Run update_user_role.py to make martin an admin');
        }
    } else {
        console.log('\n⚠️  martin@danglefeet.com not found in database');
        console.log('   User needs to be created first');
    }

    console.log('\n💡 Debug Steps:');
    console.log('1. Ensure user is logged in (check browser console for token)');
    console.log('2. Verify user has admin role in database');
    console.log('3. Check that Authorization header is sent with requests');
    console.log('4. Verify token is valid and not expired\n');

    console.log('🔧 To fix admin access for martin@danglefeet.com:');
    console.log('   python update_user_role.py\n');

    db.close();
});