const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Cấu hình kết nối tới MySQL của XAMPP
const db = mysql.createConnection({
    host: 'webbiphim-lebinhpro2005-3c67.j.aivencloud.com',
    port: 14241,
    user: 'avnadmin',
    password: 'AVNS_lMUB3EJYvSZL4SaqpZ_' ,
    database: 'defaultdb',
    ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
    if (err) {
        console.error('Lỗi kết nối MySQL: ' + err.message);
        return;
    }
    console.log('Chúc mừng! Đã kết nối thành công tới Database MySQL.');
});

// 2. API: Lấy danh sách phim từ Database
app.get('/api/phim', (req, res) => {
    const sqlQuery = "SELECT * FROM phim";
    db.query(sqlQuery, (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json(data);
    });
});

// 3. API: Đăng ký tài khoản
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    const sqlQuery = "INSERT INTO nguoidung (username, password) VALUES (?, ?)";
    
    db.query(sqlQuery, [username, password], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: "Tên đăng nhập đã tồn tại!" });
            }
            return res.status(500).json({ error: err.message });
        }
        return res.status(201).json({ message: "Đăng ký thành công!" });
    });
});

// 4. API: Đăng nhập hệ thống
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const sqlQuery = "SELECT * FROM nguoidung WHERE username = ? AND password = ?";
    
    db.query(sqlQuery, [username, password], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });
        if (data.length === 0) return res.status(400).json({ message: "Sai tài khoản hoặc mật khẩu!" });
        return res.json({ message: "Đăng nhập thành công!", user: data[0].username });
    });
});

// Chạy server tại cổng 5000
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Máy chủ Back-end đang chạy tại luồng: http://localhost:${PORT}`);
});
// ==================== API 1: LƯU LỊCH SỬ XEM PHIM ====================
app.post('/api/lichsu', (req, res) => {
    const { user_id, phim_id } = req.body;
    if (!user_id || !phim_id) {
        return res.status(400).json({ message: "Thiếu thông tin user_id hoặc phim_id" });
    }
    // Sử dụng ON DUPLICATE KEY UPDATE để nếu xem lại phim cũ, nó tự cập nhật thời gian mới nhất lên đầu
    const sql = "INSERT INTO lichsu (user_id, phim_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE thoigian = CURRENT_TIMESTAMP";
    db.query(sql, [user_id, phim_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Đã lưu vào lịch sử xem phim!" });
    });
});

// ==================== API 2: LẤY DANH SÁCH LỊCH SỬ XEM PHIM ====================
app.get('/api/lichsu/:user_id', (req, res) => {
    const { user_id } = req.params;
    const sql = `
        SELECT ls.thoigian, p.id, p.ten, p.anh, p.loai, p.chatLuong 
        FROM lichsu ls 
        JOIN phim p ON ls.phim_id = p.id 
        WHERE ls.user_id = ? 
        ORDER BY ls.thoigian DESC`;
    db.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==================== API 3: LẤY AVATAR VÀ THÔNG TIN USER ====================
app.get('/api/user/:id', (req, res) => {
    const { id } = req.params;
    db.query("SELECT id, username, avatar FROM nguoidung WHERE id = ?", [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: "Không tìm thấy người dùng" });
        res.json(results[0]);
    });
});