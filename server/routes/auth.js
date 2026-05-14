const express = require('express');

module.exports = function (deps) {
  const { jwt, bcrypt, JWT_SECRET, BCRYPT_ROUNDS, loadDB, saveDB, crypto } = deps;
  const router = express.Router();

  // --- 注册 ---
  router.post('/register', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度需在2-20个字符之间' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: '密码长度不能少于4个字符' });
    }
    if (/[<>'"\\]/.test(username)) {
      return res.status(400).json({ error: '用户名包含非法字符' });
    }

    const users = loadDB('users.json');
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ error: '用户名已被注册' });
    }

    const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    const now = new Date().toISOString();
    const user = {
      id: crypto.randomUUID(),
      username,
      passwordHash,
      phone: '',
      address: null,
      isAdmin: false,
      createdAt: now
    };

    users.push(user);
    saveDB('users.json', users);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  });

  // --- 登录 ---
  router.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }

    const users = loadDB('users.json');
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  });

  // --- 获取用户资料（需登录，由外部中间件处理） ---
  router.get('/profile', (req, res) => {
    // req.user 由外部 authMiddleware 设置
    const users = loadDB('users.json');
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // --- 更新用户资料 ---
  router.put('/profile', (req, res) => {
    const { phone, address } = req.body || {};
    const users = loadDB('users.json');
    const idx = users.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: '用户不存在' });

    if (phone !== undefined) {
      if (phone && !/^1\d{10}$/.test(phone)) {
        return res.status(400).json({ error: '手机号格式不正确' });
      }
      users[idx].phone = phone || '';
    }

    if (address !== undefined) {
      // address: { name, phone, province, city, district, detail }
      if (address) {
        if (!address.name || !address.phone || !address.detail) {
          return res.status(400).json({ error: '请填写完整的收货信息' });
        }
        users[idx].address = address;
      } else {
        users[idx].address = null;
      }
    }

    saveDB('users.json', users);
    const { passwordHash: _, ...safeUser } = users[idx];
    res.json(safeUser);
  });

  return router;
};
