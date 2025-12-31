<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// 處理 OPTIONS 請求（CORS 預檢）
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 只接受 POST 請求
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// 讀取 POST 數據
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// 驗證數據
if (!isset($data['enabled'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required field: enabled']);
    exit;
}

// 準備要保存的數據
$settings = [
    'enabled' => (bool)$data['enabled'],
    'deadline' => isset($data['deadline']) ? $data['deadline'] : '',
    'lastUpdated' => date('c') // ISO 8601 格式
];

// 保存到 JSON 文件
$filePath = __DIR__ . '/checkin-settings.json';
$result = file_put_contents($filePath, json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

if ($result === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save settings']);
    exit;
}

// 返回成功響應
echo json_encode([
    'success' => true,
    'settings' => $settings
]);
?>

