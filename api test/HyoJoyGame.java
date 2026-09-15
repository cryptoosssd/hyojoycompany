import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;
import java.awt.*;
import java.awt.event.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.Random;

public class HyoJoyGame extends JPanel implements ActionListener {

    // ============================================================
    // НАСТРОЙКИ
    // ============================================================
    static final String FIREBASE_PROJECT_ID = "hyojoy-41840";
    static final String FIREBASE_API_KEY = "AIzaSyCUSTTJhonzZPOKWUbe_qMZfMmVyFSxjPE";
    static final String HYOJOY_API_KEY = "apihyojoyofficial";
    static final String NICK_SUFFIX = "@mysite.local";
    // ============================================================

    static final long BALL_LIFETIME_MS = 3000;

    // ===== Цвета как на сайте =====
    static final Color BG = new Color(0x1a, 0x1a, 0x1a);
    static final Color BG_PANEL = new Color(0x2a, 0x2a, 0x2a);
    static final Color BG_INPUT = new Color(0x1f, 0x1f, 0x1f);
    static final Color BG_ACTIVE = new Color(0x4a, 0x4a, 0x4a);
    static final Color BG_HOVER = new Color(0x3a, 0x3a, 0x3a);
    static final Color BORDER = new Color(0x3a, 0x3a, 0x3a);
    static final Color BORDER_HOVER = new Color(0x55, 0x55, 0x55);
    static final Color TEXT = new Color(0xe0, 0xe0, 0xe0);
    static final Color TEXT_DIM = new Color(0x99, 0x99, 0x99);
    static final Color TEXT_STRONG = new Color(0xff, 0xff, 0xff);
    static final Color SUCCESS = new Color(0x88, 0xcc, 0x88);
    static final Color SUCCESS_BG = new Color(0x1f, 0x3a, 0x1f);
    static final Color SUCCESS_BORDER = new Color(0x33, 0x55, 0x33);
    static final Color DANGER = new Color(0xcc, 0x88, 0x88);
    static final Color DANGER_BG = new Color(0x3a, 0x1f, 0x1f);
    static final Color DANGER_BORDER = new Color(0x55, 0x33, 0x33);

    static final Font FONT_MAIN = new Font("Segoe UI", Font.PLAIN, 14);
    static final Font FONT_HEAD = new Font("Segoe UI", Font.PLAIN, 16);
    static final Font FONT_LOGO = new Font("Segoe UI", Font.BOLD, 22);
    static final Font FONT_BTN = new Font("Segoe UI", Font.PLAIN, 13);

    static JFrame frame;
    static JLabel scoreLabel;
    static JLabel statusLabel;

    static class Ball {
        int x, y, r, value;
        Color color;
        int dx, dy;
        long createdAt;
    }

    ArrayList<Ball> balls = new ArrayList<>();
    Random rnd = new Random();
    Timer timer;

    int score = 0;
    int targetScore = 100;
    boolean gameActive = false;

    static String idToken = null;
    static String userId = null;
    static String userNick = null;

    public HyoJoyGame() {
        setBackground(BG);
        setPreferredSize(new Dimension(900, 620));
        setFocusable(true);

        addMouseListener(new MouseAdapter() {
            @Override
            public void mousePressed(MouseEvent e) {
                if (!gameActive) return;
                for (int i = balls.size() - 1; i >= 0; i--) {
                    Ball b = balls.get(i);
                    double dist = Math.hypot(e.getX() - b.x, e.getY() - b.y);
                    if (dist <= b.r) {
                        score += b.value;
                        balls.remove(i);
                        updateScoreLabel();
                        checkWin();
                        break;
                    }
                }
            }
        });

        timer = new Timer(20, this);
        timer.start();
    }

    void updateScoreLabel() {
        if (scoreLabel != null) scoreLabel.setText("Очки: " + score + " / " + targetScore);
    }

    // ===== 100 ОЧКОВ → +3 АКЦИИ, СЧЁТЧИК В 0, ПРОДОЛЖАЕМ =====
    void checkWin() {
        if (score >= targetScore && gameActive) {
            sendSharesReward();
            score = 0;
            balls.clear();
            updateScoreLabel();
            statusLabel.setForeground(SUCCESS);
            statusLabel.setText("+3 акции! Следующие 100 очков...");
        }
    }

    @Override
    public void actionPerformed(ActionEvent e) {
        long now = System.currentTimeMillis();

        Iterator<Ball> it = balls.iterator();
        while (it.hasNext()) {
            Ball b = it.next();
            if (now - b.createdAt > BALL_LIFETIME_MS) it.remove();
        }

        if (gameActive && rnd.nextInt(100) < 3 && balls.size() < 15) {
            Ball b = new Ball();
            b.r = 22 + rnd.nextInt(22);
            b.x = b.r + rnd.nextInt(Math.max(1, getWidth() - b.r * 2));
            b.y = b.r + rnd.nextInt(Math.max(1, getHeight() - b.r * 2));
            b.value = 1 + rnd.nextInt(10);
            b.dx = rnd.nextInt(5) - 2;
            b.dy = rnd.nextInt(5) - 2;
            if (b.dx == 0) b.dx = 1;
            if (b.dy == 0) b.dy = 1;
            b.color = Color.getHSBColor((float) b.value / 11f, 0.55f, 0.9f);
            b.createdAt = now;
            balls.add(b);
        }

        for (Ball b : balls) {
            b.x += b.dx;
            b.y += b.dy;
            if (b.x - b.r < 0 || b.x + b.r > getWidth()) b.dx = -b.dx;
            if (b.y - b.r < 0 || b.y + b.r > getHeight()) b.dy = -b.dy;
        }

        repaint();
    }

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        Graphics2D g2 = (Graphics2D) g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        long now = System.currentTimeMillis();
        for (Ball b : balls) {
            long age = now - b.createdAt;
            float alpha = 1f - Math.min(1f, (float) age / BALL_LIFETIME_MS);
            if (alpha < 0.15f) alpha = 0.15f;

            // мягкое свечение
            g2.setColor(new Color(b.color.getRed(), b.color.getGreen(), b.color.getBlue(), (int)(50 * alpha)));
            g2.fillOval(b.x - b.r - 5, b.y - b.r - 5, b.r * 2 + 10, b.r * 2 + 10);

            // тело
            g2.setColor(new Color(b.color.getRed(), b.color.getGreen(), b.color.getBlue(), (int)(230 * alpha)));
            g2.fillOval(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);

            // тонкая обводка
            g2.setColor(new Color(0x55, 0x55, 0x55, (int)(255 * alpha)));
            g2.setStroke(new BasicStroke(1.5f));
            g2.drawOval(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);

            // цифра
            String txt = String.valueOf(b.value);
            g2.setFont(new Font("Segoe UI", Font.BOLD, b.r));
            FontMetrics fm = g2.getFontMetrics();
            int tw = fm.stringWidth(txt);
            int th = fm.getAscent();
            g2.setColor(new Color(0x1a, 0x1a, 0x1a, (int)(255 * alpha)));
            g2.drawString(txt, b.x - tw / 2, b.y + th / 2 - 2);
        }

        if (!gameActive && score < targetScore) {
            g2.setColor(TEXT_DIM);
            g2.setFont(new Font("Segoe UI", Font.PLAIN, 18));
            String msg = "Нажми «Начать» чтобы играть";
            FontMetrics fm = g2.getFontMetrics();
            g2.drawString(msg, (getWidth() - fm.stringWidth(msg)) / 2, getHeight() / 2);
        }
    }

    // ============================================================
    // HTTP
    // ============================================================
    static String httpPost(String url, String body, String... headers) throws IOException {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setConnectTimeout(10000);
        con.setReadTimeout(10000);
        con.setRequestMethod("POST");
        con.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        for (int i = 0; i < headers.length; i += 2) con.setRequestProperty(headers[i], headers[i + 1]);
        con.setDoOutput(true);
        try (OutputStream os = con.getOutputStream()) { os.write(body.getBytes(StandardCharsets.UTF_8)); }
        return readResponse(con);
    }

    static String httpGet(String url, String token) throws IOException {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setConnectTimeout(10000);
        con.setReadTimeout(10000);
        con.setRequestMethod("GET");
        if (token != null) con.setRequestProperty("Authorization", "Bearer " + token);
        return readResponse(con);
    }

    static String httpPatch(String url, String body, String... headers) throws IOException {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setConnectTimeout(10000);
        con.setReadTimeout(10000);
        con.setRequestMethod("POST");
        con.setRequestProperty("X-HTTP-Method-Override", "PATCH");
        con.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
        for (int i = 0; i < headers.length; i += 2) con.setRequestProperty(headers[i], headers[i + 1]);
        con.setDoOutput(true);
        try (OutputStream os = con.getOutputStream()) { os.write(body.getBytes(StandardCharsets.UTF_8)); }
        return readResponse(con);
    }

    static String readResponse(HttpURLConnection con) throws IOException {
        int code = con.getResponseCode();
        InputStream is = (code >= 200 && code < 300) ? con.getInputStream() : con.getErrorStream();
        StringBuilder sb = new StringBuilder();
        if (is != null) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) sb.append(line);
            }
        }
        if (code < 200 || code >= 300) throw new IOException("HTTP " + code + ": " + sb.toString());
        return sb.toString();
    }

    static boolean firebaseLogin(String nick, String password) {
        try {
            String email = nick.toLowerCase() + NICK_SUFFIX;
            String url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + FIREBASE_API_KEY;
            String body = "{\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"returnSecureToken\":true}";
            String resp = httpPost(url, body);
            idToken = extractJson(resp, "idToken");
            userId = extractJson(resp, "localId");
            userNick = nick;
            return idToken != null && userId != null;
        } catch (Exception e) {
            System.out.println("Login error: " + e.getMessage());
            return false;
        }
    }

     // ===== Прибавление через increment (как на сайте) =====
    static void sendSharesReward() {
        if (idToken == null || userId == null) {
            SwingUtilities.invokeLater(() -> statusLabel.setText("Не залогинен"));
            return;
        }

        new Thread(() -> {
            try {
                // commit с FieldTransform increment
                String url = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID
                        + "/databases/(default)/documents:commit";

                String body = "{"
                        + "\"writes\":[{"
                        +   "\"transform\":{"
                        +     "\"document\":\"projects/" + FIREBASE_PROJECT_ID + "/databases/(default)/documents/users/" + userId + "\","
                        +     "\"fieldTransforms\":["
                        +       "{"
                        +         "\"fieldPath\":\"sharesHYOJ\","
                        +         "\"increment\":{\"integerValue\":\"3\"}"
                        +       "}"
                        +     "]"
                        +   "}"
                        + "}]"
                        + "}";

                String resp = httpPost(url, body, "Authorization", "Bearer " + idToken);

                // Небольшая задержка для UI
                SwingUtilities.invokeLater(() -> {
                    statusLabel.setForeground(SUCCESS);
                    statusLabel.setText("+3 акции начислено!");
                });
            } catch (Exception e) {
                e.printStackTrace();
                final String msg = e.getMessage();
                SwingUtilities.invokeLater(() -> {
                    statusLabel.setForeground(DANGER);
                    statusLabel.setText("Ошибка: " + msg);
                });
            }
        }).start();
    }

    static String extractJson(String json, String key) {
        int idx = json.indexOf("\"" + key + "\"");
        if (idx < 0) return null;
        int start = json.indexOf("\"", idx + key.length() + 2) + 1;
        int end = json.indexOf("\"", start);
        if (start <= 0 || end <= 0) return null;
        return json.substring(start, end);
    }

    // ============================================================
    // СТИЛЬНЫЕ КОМПОНЕНТЫ
    // ============================================================
    static JTextField styleInput(int cols) {
        JTextField f = new JTextField(cols);
        f.setBackground(BG_INPUT);
        f.setForeground(TEXT);
        f.setCaretColor(TEXT);
        f.setFont(FONT_MAIN);
        f.setBorder(BorderFactory.createCompoundBorder(
                new LineBorder(BORDER, 1),
                new EmptyBorder(10, 12, 10, 12)
        ));
        return f;
    }

    static JPasswordField stylePassword(int cols) {
        JPasswordField f = new JPasswordField(cols);
        f.setBackground(BG_INPUT);
        f.setForeground(TEXT);
        f.setCaretColor(TEXT);
        f.setFont(FONT_MAIN);
        f.setBorder(BorderFactory.createCompoundBorder(
                new LineBorder(BORDER, 1),
                new EmptyBorder(10, 12, 10, 12)
        ));
        return f;
    }

    static JButton styleButton(String text, boolean primary, boolean danger) {
        JButton b = new JButton(text) {
            @Override
            protected void paintComponent(Graphics g) {
                Graphics2D g2 = (Graphics2D) g.create();
                g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

                Color bg, fg, border;
                if (danger) {
                    bg = getModel().isRollover() ? new Color(0x4a, 0x20, 0x20) : DANGER_BG;
                    fg = DANGER;
                    border = DANGER_BORDER;
                } else if (primary) {
                    bg = getModel().isRollover() ? new Color(0x2a, 0x4a, 0x2a) : SUCCESS_BG;
                    fg = SUCCESS;
                    border = SUCCESS_BORDER;
                } else {
                    bg = getModel().isRollover() ? BG_HOVER : BG_ACTIVE;
                    fg = TEXT_STRONG;
                    border = BORDER_HOVER;
                }

                g2.setColor(bg);
                g2.fillRect(0, 0, getWidth(), getHeight());
                g2.setColor(border);
                g2.drawRect(0, 0, getWidth() - 1, getHeight() - 1);
                g2.dispose();
                super.paintComponent(g);
            }
        };
        b.setOpaque(false);
        b.setContentAreaFilled(false);
        b.setBorderPainted(false);
        b.setFocusPainted(false);
        b.setForeground(primary ? SUCCESS : (danger ? DANGER : TEXT_STRONG));
        b.setFont(FONT_BTN);
        b.setBorder(new EmptyBorder(12, 22, 12, 22));
        b.setCursor(new Cursor(Cursor.HAND_CURSOR));
        return b;
    }

    // ============================================================
    // MAIN
    // ============================================================
    public static void main(String[] args) {
        // Стиль — тёмный
        try { UIManager.setLookAndFeel(UIManager.getCrossPlatformLookAndFeelClassName()); } catch (Exception ignore) {}

        SwingUtilities.invokeLater(() -> {
            // ===== ОКНО ВХОДА =====
            JDialog loginDialog = new JDialog((Frame) null, "HyoJoy — вход", true);
            loginDialog.setUndecorated(false);

            JPanel loginPanel = new JPanel();
            loginPanel.setLayout(new BoxLayout(loginPanel, BoxLayout.Y_AXIS));
            loginPanel.setBackground(BG_PANEL);
            loginPanel.setBorder(new EmptyBorder(30, 40, 30, 40));

            JLabel logo = new JLabel("HYOJOY");
            logo.setFont(FONT_LOGO);
            logo.setForeground(TEXT_STRONG);
            logo.setAlignmentX(Component.CENTER_ALIGNMENT);
            loginPanel.add(logo);

            JLabel sub = new JLabel("Вход в аккаунт");
            sub.setFont(FONT_MAIN);
            sub.setForeground(TEXT_DIM);
            sub.setAlignmentX(Component.CENTER_ALIGNMENT);
            sub.setBorder(new EmptyBorder(4, 0, 24, 0));
            loginPanel.add(sub);

            JLabel nickLbl = new JLabel("НИК");
            nickLbl.setFont(new Font("Segoe UI", Font.PLAIN, 11));
            nickLbl.setForeground(TEXT_DIM);
            nickLbl.setAlignmentX(Component.LEFT_ALIGNMENT);
            loginPanel.add(nickLbl);
            loginPanel.add(Box.createVerticalStrut(6));

            JTextField nickField = styleInput(20);
            nickField.setMaximumSize(new Dimension(Integer.MAX_VALUE, 40));
            nickField.setAlignmentX(Component.LEFT_ALIGNMENT);
            loginPanel.add(nickField);
            loginPanel.add(Box.createVerticalStrut(16));

            JLabel passLbl = new JLabel("ПАРОЛЬ");
            passLbl.setFont(new Font("Segoe UI", Font.PLAIN, 11));
            passLbl.setForeground(TEXT_DIM);
            passLbl.setAlignmentX(Component.LEFT_ALIGNMENT);
            loginPanel.add(passLbl);
            loginPanel.add(Box.createVerticalStrut(6));

            JPasswordField passField = stylePassword(20);
            passField.setMaximumSize(new Dimension(Integer.MAX_VALUE, 40));
            passField.setAlignmentX(Component.LEFT_ALIGNMENT);
            loginPanel.add(passField);
            loginPanel.add(Box.createVerticalStrut(24));

            JButton loginBtn = styleButton("ВОЙТИ И ИГРАТЬ", false, false);
            loginBtn.setAlignmentX(Component.CENTER_ALIGNMENT);
            loginBtn.setMaximumSize(new Dimension(Integer.MAX_VALUE, 44));
            loginPanel.add(loginBtn);

            final boolean[] loggedIn = { false };

            loginBtn.addActionListener(ev -> {
                String nick = nickField.getText().trim();
                String password = new String(passField.getPassword());
                if (nick.isEmpty() || password.isEmpty()) return;

                loginBtn.setText("ПРОВЕРКА...");
                loginBtn.setEnabled(false);

                new Thread(() -> {
                    boolean ok = firebaseLogin(nick, password);
                    SwingUtilities.invokeLater(() -> {
                        if (ok) {
                            loggedIn[0] = true;
                            loginDialog.dispose();
                        } else {
                            loginBtn.setText("НЕВЕРНЫЙ НИК ИЛИ ПАРОЛЬ");
                            loginBtn.setEnabled(true);
                        }
                    });
                }).start();
            });

            loginDialog.setContentPane(loginPanel);
            loginDialog.pack();
            loginDialog.setLocationRelativeTo(null);
            loginDialog.setVisible(true);

            if (!loggedIn[0]) return;

            // ===== ОСНОВНОЕ ОКНО =====
            frame = new JFrame("HyoJoy — кликер");
            frame.getContentPane().setBackground(BG);

            JPanel root = new JPanel(new BorderLayout());
            root.setBackground(BG);

            // Шапка
            JPanel topBar = new JPanel(new BorderLayout());
            topBar.setBackground(BG_PANEL);
            topBar.setBorder(BorderFactory.createMatteBorder(0, 0, 1, 0, BORDER));

            JLabel logoHeader = new JLabel("HYOJOY");
            logoHeader.setFont(new Font("Segoe UI", Font.BOLD, 16));
            logoHeader.setForeground(TEXT_STRONG);
            logoHeader.setBorder(new EmptyBorder(14, 24, 14, 0));

            JPanel headerRight = new JPanel(new FlowLayout(FlowLayout.RIGHT, 12, 0));
            headerRight.setOpaque(false);
            headerRight.setBorder(new EmptyBorder(0, 0, 0, 24));

            scoreLabel = new JLabel("Очки: 0 / 100");
            scoreLabel.setFont(FONT_HEAD);
            scoreLabel.setForeground(TEXT_STRONG);

            statusLabel = new JLabel("Залогинен: " + userNick);
            statusLabel.setFont(new Font("Segoe UI", Font.PLAIN, 13));
            statusLabel.setForeground(SUCCESS);

            headerRight.add(statusLabel);
            headerRight.add(scoreLabel);

            topBar.add(logoHeader, BorderLayout.WEST);
            topBar.add(headerRight, BorderLayout.EAST);

            // Игровое поле
            HyoJoyGame game = new HyoJoyGame();

            // Нижняя панель с кнопками
            JPanel bottomBar = new JPanel(new FlowLayout(FlowLayout.CENTER, 12, 14));
            bottomBar.setBackground(BG_PANEL);
            bottomBar.setBorder(BorderFactory.createMatteBorder(1, 0, 0, 0, BORDER));

            JButton startBtn = styleButton("НАЧАТЬ", true, false);
            JButton resetBtn = styleButton("СБРОС", false, false);

            bottomBar.add(startBtn);
            bottomBar.add(resetBtn);

            startBtn.addActionListener(e -> {
                game.score = 0;
                game.balls.clear();
                game.updateScoreLabel();
                game.gameActive = true;
                game.timer.start();
                statusLabel.setForeground(SUCCESS);
                statusLabel.setText("Игра началась!");
            });

            resetBtn.addActionListener(e -> {
                game.score = 0;
                game.balls.clear();
                game.gameActive = false;
                game.timer.stop();
                game.updateScoreLabel();
                statusLabel.setForeground(TEXT_DIM);
                statusLabel.setText("Сброшено");
                game.repaint();
            });

            root.add(topBar, BorderLayout.NORTH);
            root.add(game, BorderLayout.CENTER);
            root.add(bottomBar, BorderLayout.SOUTH);

            frame.setContentPane(root);
            frame.pack();
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            frame.setLocationRelativeTo(null);
            frame.setVisible(true);
        });
    }
}