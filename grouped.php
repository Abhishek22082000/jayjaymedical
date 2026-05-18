<?php
require __DIR__ . '/db.php';
require __DIR__ . '/paginate.php';

$search       = trim($_GET['q']      ?? '');
$filterStatus = trim($_GET['status'] ?? 'expiring');

$today    = new DateTime('today');
$todayStr = $today->format('Y-m-d');
$weekStr  = (clone $today)->modify('+7 days')->format('Y-m-d');

$where  = '1=1';
$params = [];
if ($search !== '') {
    $where .= ' AND (tablet_name LIKE ? OR manufacturer LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like; $params[] = $like;
}

$having = '1=1';
if ($filterStatus === 'expiring') {
    $having = 'expiring_batches > 0';
} elseif ($filterStatus === 'expired') {
    $having = 'expired_batches > 0';
} elseif ($filterStatus === 'attention') {
    $having = '(expiring_batches > 0 OR expired_batches > 0)';
}

$baseSelect = "
        tablet_name,
        manufacturer,
        COUNT(*)                                              AS batches,
        COUNT(DISTINCT client_name)                           AS clients,
        COALESCE(SUM(quantity), 0)                            AS total_qty,
        MIN(end_date)                                         AS earliest_expiry,
        MAX(end_date)                                         AS latest_expiry,
        SUM(CASE WHEN end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS expiring_batches,
        SUM(CASE WHEN end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN quantity ELSE 0 END) AS expiring_qty,
        SUM(CASE WHEN end_date < CURDATE() THEN 1 ELSE 0 END)        AS expired_batches,
        SUM(CASE WHEN end_date < CURDATE() THEN quantity ELSE 0 END) AS expired_qty
";

$countSql = "
    SELECT COUNT(*) FROM (
        SELECT $baseSelect
        FROM tablets
        WHERE $where
        GROUP BY tablet_name, manufacturer
        HAVING $having
    ) AS t
";
$countStmt = $pdo->prepare($countSql);
$countStmt->execute($params);
$filteredTotal = (int)$countStmt->fetchColumn();

$perPage  = 15;
$lastPage = max(1, (int)ceil($filteredTotal / $perPage));
$page = max(1, (int)($_GET['page'] ?? 1));
if ($page > $lastPage) $page = $lastPage;
$offset = ($page - 1) * $perPage;

$sql = "
    SELECT $baseSelect
    FROM tablets
    WHERE $where
    GROUP BY tablet_name, manufacturer
    HAVING $having
    ORDER BY (expiring_batches + expired_batches) DESC, tablet_name ASC, manufacturer ASC
    LIMIT $perPage OFFSET $offset
";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$groups = $stmt->fetchAll();

$expClientsStmt = $pdo->prepare("
    SELECT tablet_name, manufacturer, GROUP_CONCAT(DISTINCT client_name ORDER BY client_name SEPARATOR ', ') AS clients
      FROM tablets
     WHERE end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
     GROUP BY tablet_name, manufacturer
");
$expClientsStmt->execute();
$expClients = [];
foreach ($expClientsStmt->fetchAll() as $r) {
    $expClients[$r['tablet_name'] . '||' . $r['manufacturer']] = $r['clients'];
}

function daysLeft($endDate, $today) {
    $end = new DateTime($endDate);
    return (int)$today->diff($end)->format('%r%a');
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>By Tablet &mdash; JAY-JAY MEDICAL</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>

<nav class="app-bar">
    <div class="container d-flex align-items-center justify-content-between">
        <a class="brand" href="index.php">
            <span class="brand-logo"><i class="bi bi-capsule"></i></span>
            <span>
                JAY-JAY MEDICAL
                <span class="brand-sub">Tablet records &amp; expiry</span>
            </span>
        </a>
        <div class="d-flex gap-2">
            <a href="index.php" class="btn btn-ghost btn-sm">
                <i class="bi bi-list-ul"></i> <span class="d-none d-sm-inline">All Records</span>
            </a>
            <a href="tablet_form.php" class="btn btn-brand btn-sm">
                <i class="bi bi-plus-lg"></i> <span class="d-none d-sm-inline">Add Tablet</span>
            </a>
        </div>
    </div>
</nav>

<main class="container py-3 pb-5">

    <div class="page-strip d-flex flex-wrap justify-content-between align-items-end gap-2">
        <div>
            <h1>By Tablet</h1>
            <p>Same tablet grouped across all clients &mdash; quickly see which products are expiring.</p>
        </div>
        <div class="d-none d-md-flex small" style="color: var(--c-text-muted);">
            <i class="bi bi-calendar3 me-2"></i> <?= $today->format('l, d M Y') ?>
        </div>
    </div>

    <!-- Search + filter -->
    <div class="surface p-3 mb-4">
        <form method="get" class="row g-2 align-items-end">
            <div class="col-12 col-md-6">
                <label for="q" class="field-label">
                    <i class="bi bi-search"></i> Search
                </label>
                <input type="text" id="q" name="q"
                       value="<?= h($search) ?>"
                       class="form-control"
                       placeholder="Tablet name or manufacturer...">
            </div>
            <div class="col-7 col-md-3">
                <label for="status" class="field-label">
                    <i class="bi bi-funnel"></i> Show
                </label>
                <select id="status" name="status" class="form-select">
                    <option value="expiring"  <?= $filterStatus === 'expiring'  ? 'selected' : '' ?>>Expiring &le; 7 days</option>
                    <option value="expired"   <?= $filterStatus === 'expired'   ? 'selected' : '' ?>>Has expired stock</option>
                    <option value="attention" <?= $filterStatus === 'attention' ? 'selected' : '' ?>>Needs attention (any)</option>
                    <option value="all"       <?= $filterStatus === 'all'       ? 'selected' : '' ?>>All tablets</option>
                </select>
            </div>
            <div class="col-5 col-md-3 d-flex gap-2">
                <button type="submit" class="btn btn-brand flex-grow-1 justify-content-center">
                    <i class="bi bi-funnel-fill"></i> Filter
                </button>
                <?php if ($search !== '' || $filterStatus !== 'expiring'): ?>
                    <a href="grouped.php" class="btn btn-ghost" title="Reset">
                        <i class="bi bi-arrow-clockwise"></i>
                    </a>
                <?php endif; ?>
            </div>
        </form>
    </div>

    <!-- Groups table -->
    <div class="surface">
        <div class="d-flex justify-content-between align-items-center px-3 px-md-4 py-3" style="border-bottom: 1px solid var(--c-border);">
            <div>
                <div class="fw-semibold">Tablet Groups</div>
                <div class="small" style="color: var(--c-text-muted);">
                    <?= $filteredTotal ?> tablet/manufacturer combination<?= $filteredTotal === 1 ? '' : 's' ?>
                </div>
            </div>
            <span class="pill pill--info">
                <span class="pill__dot"></span>
                Most urgent first
            </span>
        </div>

        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="padding-left: 1.25rem;">Tablet</th>
                        <th>Clients with Expiring Stock</th>
                        <th class="text-end">Batches</th>
                        <th class="text-end">Total Qty</th>
                        <th class="text-end">Expiring</th>
                        <th class="text-end">Expired</th>
                        <th>Earliest Expiry</th>
                        <th class="text-end" style="padding-right: 1.25rem;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($groups)): ?>
                        <tr>
                            <td colspan="8">
                                <div class="empty">
                                    <i class="bi bi-check2-circle"></i>
                                    <?php if ($filterStatus === 'expiring'): ?>
                                        Nothing is expiring in the next 7 days.
                                    <?php elseif ($filterStatus === 'expired'): ?>
                                        No expired stock found.
                                    <?php else: ?>
                                        No tablets match the filter.
                                    <?php endif; ?>
                                    <div class="small mt-1">
                                        <a href="?status=all">View all tablets</a>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($groups as $g):
                            $key      = $g['tablet_name'] . '||' . $g['manufacturer'];
                            $clients  = $expClients[$key] ?? '';
                            $earlyDl  = daysLeft($g['earliest_expiry'], $today);
                            $rowClass = '';
                            if ((int)$g['expired_batches']  > 0) $rowClass = 'row-danger';
                            elseif ((int)$g['expiring_batches'] > 0) $rowClass = 'row-warning';
                            $linkParams = http_build_query([
                                'tablet' => $g['tablet_name'],
                                'mfr'    => $g['manufacturer'],
                            ]); ?>
                            <tr class="<?= $rowClass ?>">
                                <td style="padding-left: 1.25rem;">
                                    <div class="cell-tablet"><?= h($g['tablet_name']) ?></div>
                                    <?php if (!empty($g['manufacturer'])): ?>
                                        <div class="cell-meta"><i class="bi bi-building me-1"></i><?= h($g['manufacturer']) ?></div>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($clients !== ''): ?>
                                        <span style="color: var(--c-warning-text);"><?= h($clients) ?></span>
                                    <?php else: ?>
                                        <span style="color: var(--c-text-soft);">&mdash;</span>
                                    <?php endif; ?>
                                </td>
                                <td class="text-end fw-semibold"><?= (int)$g['batches'] ?></td>
                                <td class="text-end fw-semibold"><?= (int)$g['total_qty'] ?></td>
                                <td class="text-end">
                                    <?php if ((int)$g['expiring_batches'] > 0): ?>
                                        <span class="pill pill--warning">
                                            <span class="pill__dot"></span>
                                            <?= (int)$g['expiring_batches'] ?> &middot; <?= (int)$g['expiring_qty'] ?>u
                                        </span>
                                    <?php else: ?>
                                        <span style="color: var(--c-text-soft);">0</span>
                                    <?php endif; ?>
                                </td>
                                <td class="text-end">
                                    <?php if ((int)$g['expired_batches'] > 0): ?>
                                        <span class="pill pill--danger">
                                            <span class="pill__dot"></span>
                                            <?= (int)$g['expired_batches'] ?> &middot; <?= (int)$g['expired_qty'] ?>u
                                        </span>
                                    <?php else: ?>
                                        <span style="color: var(--c-text-soft);">0</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?= h(date('d M Y', strtotime($g['earliest_expiry']))) ?>
                                    <?php if ($earlyDl < 0): ?>
                                        <div class="cell-meta" style="color: var(--c-danger-text);"><?= abs($earlyDl) ?>d ago</div>
                                    <?php elseif ($earlyDl <= 7): ?>
                                        <div class="cell-meta" style="color: var(--c-warning-text);">
                                            <?php if ($earlyDl === 0): ?>today
                                            <?php elseif ($earlyDl === 1): ?>tomorrow
                                            <?php else: ?>in <?= $earlyDl ?> days<?php endif; ?>
                                        </div>
                                    <?php endif; ?>
                                </td>
                                <td class="text-end" style="padding-right: 1.25rem; white-space: nowrap;">
                                    <a href="index.php?<?= $linkParams ?>" class="btn btn-icon-primary btn-sm" title="View all batches">
                                        <i class="bi bi-eye"></i>
                                    </a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php renderPager($filteredTotal, $page, $perPage); ?>
    </div>

    <p class="text-center small mt-4 mb-0" style="color: var(--c-text-soft);">
        &copy; <?= date('Y') ?> JAY-JAY MEDICAL
    </p>
</main>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
