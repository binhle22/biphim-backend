    const express = require('express');
    const cors = require('cors');
    const mysql = require('mysql2');

    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.static('movieweb'));

    // 1. Cấu hình kết nối tới MySQL của Aiven Đám Mây
    const db = mysql.createConnection({
        host: 'webbiphim-lebinhpro2005-3c67.j.aivencloud.com',
        port: 14241,
        user: 'avnadmin',
        password: 'AVNS_lMUB3EJYvSZL4SaqpZ_',
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
    // Thêm loai_tk vào đây
    const { username, password, loai_tk } = req.body;
    
    // Thêm cột loai_tk vào câu lệnh INSERT
    const sqlQuery = "INSERT INTO nguoidung (username, password, loai_tk) VALUES (?, ?, ?)";
    
    // Nếu loai_tk không gửi lên thì mặc định là 'thuong'
    const role = loai_tk || 'thuong';
    
    db.query(sqlQuery, [username, password, role], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: "Tên đăng nhập đã tồn tại!" });
            }
            return res.status(500).json({ error: err.message });
        }
        return res.status(201).json({ message: "Đăng ký thành công!" });
    });
});

    // 4. API: Đăng nhập hệ thống (ĐÃ CẬP NHẬT TRẢ VỀ USERID ĐỘNG)
    app.post('/api/auth/login', (req, res) => {
        const { username, password } = req.body;
        const sqlQuery = "SELECT * FROM nguoidung WHERE username = ? AND password = ?";
        
        db.query(sqlQuery, [username, password], (err, data) => {
            if (err) return res.status(500).json({ error: err.message });
            if (data.length === 0) return res.status(400).json({ message: "Sai tài khoản hoặc mật khẩu!" });
            
            // TRẢ VỀ CẢ USERNAME VÀ ID ĐỂ PHÂN TÁCH LỊCH SỬ XEM PHIM TRÊN FRONT-END
            // TRONG API /api/auth/login
return res.json({ 
    message: "Đăng nhập thành công!", 
    user: data[0].username,
    userId: data[0].id,
    loai_tk: data[0].loai_tk // <--- THÊM DÒNG NÀY VÀO
});
        });
    });

    // 5. API: Lưu lịch sử xem phim
    app.post('/api/lichsu', (req, res) => {
        const { user_id, phim_id } = req.body;
        if (!user_id || !phim_id) {
            return res.status(400).json({ message: "Thiếu thông tin để lưu lịch sử!" });
        }
        const sqlQuery = "INSERT INTO lichsu (user_id, phim_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE thoigian = CURRENT_TIMESTAMP";
        
        db.query(sqlQuery, [user_id, phim_id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            return res.json({ message: "Đã lưu lịch sử xem phim thành công!" });
        });
    });

    // 6. API: Lấy danh sách lịch sử xem phim của từng User
    app.get('/api/lichsu/:user_id', (req, res) => {
        const { user_id } = req.params;
        const sqlQuery = `
            SELECT ls.thoigian, p.id, p.ten, p.anh, p.loai, p.chatLuong 
            FROM lichsu ls 
            JOIN phim p ON ls.phim_id = p.id 
            WHERE ls.user_id = ? 
            ORDER BY ls.thoigian DESC`;
            
        db.query(sqlQuery, [user_id], (err, data) => {
            if (err) return res.status(500).json({ error: err.message });
            return res.json(data);
        });
    });

    // Chạy server tại cổng 5000
    const PORT = 5000;
    app.listen(PORT, () => {
        console.log(`Máy chủ Back-end đang chạy tại luồng: http://localhost:${PORT}`);
    });
    app.post('/api/nap-tien', (req, res) => {
        const { userId, soTien } = req.body;
        const sql = "UPDATE nguoidung SET tien_ao = tien_ao + ? WHERE id = ?";
        db.query(sql, [soTien, userId], (err, result) => {
            if(err) return res.status(500).send(err);
            res.send({ message: "Nạp tiền thành công!" });
        });
    });

app.post('/api/mua-vip', (req, res) => {
    const { userId } = req.body;
    const giaVip = 100000; // Định nghĩa giá VIP

    const sql = "UPDATE nguoidung SET tien_ao = tien_ao - ?, loai_tk = 'vip' WHERE id = ? AND tien_ao >= ?";
    
    db.query(sql, [giaVip, userId, giaVip], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        if (result.affectedRows > 0) {
            // Nâng cấp thành công -> Mới ghi log vào đây
            const sqlLog = "INSERT INTO nangVIP (user_id, so_tien, loai_gd) VALUES (?, ?, 'Nang cap VIP')";
            db.query(sqlLog, [userId, giaVip], (errLog, resultLog) => {
                if (errLog) console.error("Lỗi ghi log:", errLog); // Ghi log lỗi nếu có
                return res.json({ success: true, message: "Nâng cấp VIP thành công!" });
            });
        } else {
            return res.status(400).json({ success: false, message: "Không đủ xu hoặc tài khoản đã là VIP!" });
        }
    });
});
    
    
app.post('/api/auth/doi-mat-khau', (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;
    // ... code kiểm tra và update mật khẩu ...
    const sqlCheck = "SELECT password FROM nguoidung WHERE id = ?";
    db.query(sqlCheck, [userId], (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi truy vấn DB!" });
        if (results.length === 0) return res.status(404).json({ message: "Không tìm thấy user!" });
        
        if (results[0].password !== oldPassword) {
            return res.status(400).json({ message: "Mật khẩu cũ không đúng!" });
        }
        
        // Cập nhật mật khẩu mới
        const sqlUpdate = "UPDATE nguoidung SET password = ? WHERE id = ?";
        db.query(sqlUpdate, [newPassword, userId], (err, result) => {
            if (err) return res.status(500).json({ message: "Lỗi cập nhật mật khẩu!" });
            return res.json({ message: "Đổi mật khẩu thành công!" });
        });
        const sqlLog = "INSERT INTO matkhau (user_id, trang_thai) VALUES (?, 'Thành công')";
        db.query(sqlLog, [userId], (errLog, resultLog) => {
            // Sau khi ghi log xong mới trả về phản hồi cho web
            return res.json({ message: "Đổi mật khẩu và ghi nhật ký thành công!" });
        });
    });
});
// server.js - Thêm các API này vào sau các API khác

// API lấy lịch sử nâng cấp VIP
app.get('/api/admin/lich-su-vip', (req, res) => {
    const sql = `SELECT nangVIP.so_tien, nangVIP.ngay_gd, nguoidung.username 
                 FROM nangVIP 
                 JOIN nguoidung ON nangVIP.user_id = nguoidung.id 
                 ORDER BY nangVIP.ngay_gd DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// API lấy lịch sử đổi mật khẩu
app.get('/api/admin/log-mat-khau', (req, res) => {
    const sql = `SELECT matkhau.thoi_gian_doi, matkhau.trang_thai, nguoidung.username 
                 FROM matkhau 
                 JOIN nguoidung ON matkhau.user_id = nguoidung.id 
                 ORDER BY matkhau.thoi_gian_doi DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});