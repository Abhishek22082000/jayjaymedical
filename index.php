<?php
require __DIR__ . '/db.php';
require __DIR__ . '/paginate.php';

if (isset($_GET['delete'])) {
    $delId = (int)$_GET['delete'];
    if ($delId) {
        $stmt = $pdo->prepare('DELETE FROM tablets WHERE id = ?');
        $stmt->execute([$delId]);
        header('Location: index.php?deleted=1');
        exit;
    }
}

$search       = trim($_GET['q']       ?? '');
$filterStatus = trim($_GET['status']  ?? '');
$filterTablet = trim($_GET['tablet']  ?? '');
$filterMfr    = trim($_GET['mfr']     ?? '');

$today     = new DateTime('today');
$weekAhead = (clone $today)->modify('+7 days');
$todayStr  = $today->format('Y-m-d');
$weekStr   = $weekAhead->format('Y-m-d');

$where  = '1=1';
$params = [];

if ($search !== '') {
    $where .= ' AND (tablet_name LIKE ? OR client_name LIKE ? OR batch_number LIKE ? OR manufacturer LIKE ?)';
    $like = '%' . $search . '%';
    $params[] = $like; $params[] = $like; $params[] = $like; $params[] = $like;
}

if ($filterTablet !== '') {
    $where .= ' AND tablet_name = ?';
    $params[] = $filterTablet;
}
if ($filterMfr !== '') {
    $where .= ' AND manufacturer = ?';
    $params[] = $filterMfr;
}

if ($filterStatus === 'expiring') {
    $where .= ' AND end_date BETWEEN ? AND ?';
    $params[] = $todayStr; $params[] = $weekStr;
} elseif ($filterStatus === 'expired') {
    $where .= ' AND end_date < ?';
    $params[] = $todayStr;
} elseif ($filterStatus === 'active') {
    $where .= ' AND end_date > ?';
    $params[] = $weekStr;
}

$totalStmt = $pdo->prepare("SELECT COUNT(*) FROM tablets WHERE $where");
$totalStmt->execute($params);
$filteredTotal = (int)$totalStmt->fetchColumn();

$perPage = 15;
$lastPage = max(1, (int)ceil($filteredTotal / $perPage));
$page = max(1, (int)($_GET['page'] ?? 1));
if ($page > $lastPage) $page = $lastPage;
$offset = ($page - 1) * $perPage;

$sql = "SELECT * FROM tablets WHERE $where ORDER BY end_date ASC, id DESC LIMIT $perPage OFFSET $offset";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$tablets = $stmt->fetchAll();

$counts = $pdo->query("
    SELECT
        SUM(CASE WHEN end_date < CURDATE() THEN 1 ELSE 0 END) AS expired,
        SUM(CASE WHEN end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS expiring,
        SUM(CASE WHEN end_date > DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS active,
        COALESCE(SUM(quantity), 0) AS total_qty,
        COUNT(*) AS total
    FROM tablets
")->fetch();

$expiringSoon = $pdo->query("
    SELECT * FROM tablets
     WHERE end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
     ORDER BY end_date ASC
")->fetchAll();

function statusFor($endDate, $todayStr, $weekStr) {
    if ($endDate < $todayStr) {
        return ['label' => 'Expired',       'variant' => 'danger',  'row' => 'row-danger'];
    }
    if ($endDate <= $weekStr) {
        return ['label' => 'Expiring Soon', 'variant' => 'warning', 'row' => 'row-warning'];
    }
    return ['label' => 'Active',            'variant' => 'success', 'row' => ''];
}

function daysLeft($endDate, $today) {
    $end  = new DateTime($endDate);
    return (int)$today->diff($end)->format('%r%a');
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tablet Inventory &mdash; JAY-JAY MEDICAL</title>

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
            <a href="grouped.php" class="btn btn-ghost btn-sm">
                <i class="bi bi-collection"></i> <span class="d-none d-sm-inline">By Tablet</span>
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
            <h1>Dashboard</h1>
            <p>Overview of all tablet records, batches and upcoming expirations.</p>
        </div>
        <div class="d-none d-md-flex small" style="color: var(--c-text-muted);">
            <i class="bi bi-calendar3 me-2"></i> <?= $today->format('l, d M Y') ?>
        </div>
    </div>

    <?php if (isset($_GET['saved'])): ?>
        <div class="alert alert-soft alert-success-soft d-flex align-items-center mb-3">
            <i class="bi bi-check-circle-fill me-2" style="color: var(--c-success);"></i>
            <div>Tablet record saved successfully.</div>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>
    <?php if (isset($_GET['deleted'])): ?>
        <div class="alert alert-soft alert-danger-soft d-flex align-items-center mb-3">
            <i class="bi bi-trash-fill me-2" style="color: var(--c-danger);"></i>
            <div>Tablet record deleted.</div>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <!-- Stats -->
    <div class="row g-3 mb-4">
        <div class="col-6 col-lg-3">
            <div class="stat stat--total">
                <div class="stat__accent"></div>
                <span class="stat__icon"><i class="bi bi-collection-fill"></i></span>
                <div>
                    <p class="stat__value"><?= (int)$counts['total'] ?></p>
                    <p class="stat__label">Total Batches &middot; <?= (int)$counts['total_qty'] ?> units</p>
                </div>
            </div>
        </div>
        <div class="col-6 col-lg-3">
            <div class="stat stat--active">
                <div class="stat__accent"></div>
                <span class="stat__icon"><i class="bi bi-shield-check"></i></span>
                <div>
                    <p class="stat__value"><?= (int)$counts['active'] ?></p>
                    <p class="stat__label">Active</p>
                </div>
            </div>
        </div>
        <div class="col-6 col-lg-3">
            <div class="stat stat--expiring">
                <div class="stat__accent"></div>
                <span class="stat__icon"><i class="bi bi-clock-history"></i></span>
                <div>
                    <p class="stat__value"><?= (int)$counts['expiring'] ?></p>
                    <p class="stat__label">Expiring &le; 7 days</p>
                </div>
            </div>
        </div>
        <div class="col-6 col-lg-3">
            <div class="stat stat--expired">
                <div class="stat__accent"></div>
                <span class="stat__icon"><i class="bi bi-x-octagon-fill"></i></span>
                <div>
                    <p class="stat__value"><?= (int)$counts['expired'] ?></p>
                    <p class="stat__label">Expired</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Expiring soon banner -->
    <?php if (!empty($expiringSoon)): ?>
        <div class="alert alert-soft alert-warning-soft mb-4">
            <div class="d-flex align-items-start gap-3">
                <i class="bi bi-bell-fill fs-4" style="color: var(--c-warning);"></i>
                <div class="flex-grow-1">
                    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                        <h6 class="mb-0 fw-semibold">
                            <?= count($expiringSoon) ?> batch<?= count($expiringSoon) > 1 ? 'es' : '' ?>
                            expiring within the next 7 days
                        </h6>
                        <a href="grouped.php?status=expiring" class="small fw-semibold" style="color: var(--c-warning-text);">
                            See by tablet <i class="bi bi-arrow-right"></i>
                        </a>
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                        <?php foreach ($expiringSoon as $t):
                            $d = daysLeft($t['end_date'], $today); ?>
                            <span class="pill pill--warning">
                                <span class="pill__dot"></span>
                                <?= h($t['tablet_name']) ?>
                                <?php if ($t['manufacturer'] !== ''): ?><span style="opacity:.7;">(<?= h($t['manufacturer']) ?>)</span><?php endif; ?>
                                &middot; <?= h($t['client_name']) ?>
                                &middot; <?= (int)$t['quantity'] ?>u
                                <span style="opacity:.8;">
                                    &mdash;
                                    <?php if ($d === 0): ?>today
                                    <?php elseif ($d === 1): ?>tomorrow
                                    <?php else: ?>in <?= $d ?>d<?php endif; ?>
                                </span>
                            </span>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>
    <?php endif; ?>

    <!-- Search + filter -->
    <div class="surface p-3 mb-4">
        <form method="get" class="row g-2 align-items-end">
            <div class="col-12 col-md-5">
                <label for="q" class="field-label">
                    <i class="bi bi-search"></i> Search
                </label>
                <input type="text" id="q" name="q"
                       value="<?= h($search) ?>"
                       class="form-control"
                       placeholder="Tablet, client, batch or manufacturer...">
            </div>
            <div class="col-7 col-md-3">
                <label for="status" class="field-label">
                    <i class="bi bi-funnel"></i> Status
                </label>
                <select id="status" name="status" class="form-select">
                    <option value=""         <?= $filterStatus === ''         ? 'selected' : '' ?>>All Statuses</option>
                    <option value="active"   <?= $filterStatus === 'active'   ? 'selected' : '' ?>>Active</option>
                    <option value="expiring" <?= $filterStatus === 'expiring' ? 'selected' : '' ?>>Expiring &le; 7 days</option>
                    <option value="expired"  <?= $filterStatus === 'expired'  ? 'selected' : '' ?>>Expired</option>
                </select>
            </div>
            <?php if ($filterTablet !== ''): ?>
                <input type="hidden" name="tablet" value="<?= h($filterTablet) ?>">
            <?php endif; ?>
            <?php if ($filterMfr !== ''): ?>
                <input type="hidden" name="mfr" value="<?= h($filterMfr) ?>">
            <?php endif; ?>
            <div class="col-5 col-md-4 d-flex gap-2">
                <button type="submit" class="btn btn-brand flex-grow-1 justify-content-center">
                    <i class="bi bi-funnel-fill"></i> Filter
                </button>
                <?php if ($search !== '' || $filterStatus !== '' || $filterTablet !== '' || $filterMfr !== ''): ?>
                    <a href="index.php" class="btn btn-ghost" title="Clear filters">
                        <i class="bi bi-x-lg"></i>
                    </a>
                <?php endif; ?>
            </div>
        </form>

        <?php if ($filterTablet !== '' || $filterMfr !== ''): ?>
            <div class="d-flex flex-wrap gap-2 mt-3">
                <?php if ($filterTablet !== ''): ?>
                    <span class="pill pill--info">
                        <span class="pill__dot"></span> Tablet: <?= h($filterTablet) ?>
                    </span>
                <?php endif; ?>
                <?php if ($filterMfr !== ''): ?>
                    <span class="pill pill--info">
                        <span class="pill__dot"></span> Manufacturer: <?= h($filterMfr) ?>
                    </span>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </div>

    <!-- Records table -->
    <div class="surface">
        <div class="d-flex justify-content-between align-items-center px-3 px-md-4 py-3" style="border-bottom: 1px solid var(--c-border);">
            <div>
                <div class="fw-semibold">Tablet Records</div>
                <div class="small" style="color: var(--c-text-muted);">
                    <?= $filteredTotal ?> matching record<?= $filteredTotal === 1 ? '' : 's' ?>
                    <?php if ($filteredTotal !== (int)$counts['total']): ?>
                        &middot; out of <?= (int)$counts['total'] ?> total
                    <?php endif; ?>
                </div>
            </div>
            <span class="pill pill--info">
                <span class="pill__dot"></span>
                Sorted by expiry
            </span>
        </div>

        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="padding-left: 1.25rem;">#</th>
                        <th>Tablet / Manufacturer</th>
                        <th>Client</th>
                        <th>Batch</th>
                        <th class="text-end">Qty</th>
                        <th>Mfg / Start</th>
                        <th>Expiry</th>
                        <th>Status</th>
                        <th class="text-end" style="padding-right: 1.25rem;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($tablets)): ?>
                        <tr>
                            <td colspan="9">
                                <div class="empty">
                                    <i class="bi bi-inbox"></i>
                                    No tablet records found.
                                    <?php if ($search !== '' || $filterStatus !== '' || $filterTablet !== '' || $filterMfr !== ''): ?>
                                        <div class="small mt-1">Try clearing the filters.</div>
                                    <?php else: ?>
                                        <div class="small mt-2">
                                            <a href="tablet_form.php" class="btn btn-brand btn-sm">
                                                <i class="bi bi-plus-lg"></i> Add your first tablet
                                            </a>
                                        </div>
                                    <?php endif; ?>
                                </div>
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($tablets as $i => $t):
                            $s  = statusFor($t['end_date'], $todayStr, $weekStr);
                            $dl = daysLeft($t['end_date'], $today); ?>
                            <tr class="<?= $s['row'] ?>">
                                <td style="padding-left: 1.25rem; color: var(--c-text-soft);"><?= $offset + $i + 1 ?></td>
                                <td>
                                    <div class="cell-tablet"><?= h($t['tablet_name']) ?></div>
                                    <?php if (!empty($t['manufacturer'])): ?>
                                        <div class="cell-meta"><i class="bi bi-building me-1"></i><?= h($t['manufacturer']) ?></div>
                                    <?php endif; ?>
                                </td>
                                <td><?= h($t['client_name']) ?></td>
                                <td><span class="cell-batch"><?= h($t['batch_number']) ?></span></td>
                                <td class="text-end fw-semibold"><?= (int)$t['quantity'] ?></td>
                                <td>
                                    <?php if (!empty($t['manufacturing_date'])): ?>
                                        <?= h(date('d M Y', strtotime($t['manufacturing_date']))) ?>
                                        <div class="cell-meta">Started <?= h(date('d M Y', strtotime($t['start_date']))) ?></div>
                                    <?php else: ?>
                                        <?= h(date('d M Y', strtotime($t['start_date']))) ?>
                                        <div class="cell-meta">Started</div>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?= h(date('d M Y', strtotime($t['end_date']))) ?>
                                    <?php if ($s['label'] === 'Expiring Soon'): ?>
                                        <div class="cell-meta" style="color: var(--c-warning-text);">
                                            <?php if ($dl === 0): ?>Expires today
                                            <?php elseif ($dl === 1): ?>In 1 day
                                            <?php else: ?>In <?= $dl ?> days<?php endif; ?>
                                        </div>
                                    <?php elseif ($s['label'] === 'Expired'): ?>
                                        <div class="cell-meta" style="color: var(--c-danger-text);">
                                            <?= abs($dl) ?> day<?= abs($dl) === 1 ? '' : 's' ?> ago
                                        </div>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span class="pill pill--<?= $s['variant'] ?>">
                                        <span class="pill__dot"></span>
                                        <?= $s['label'] ?>
                                    </span>
                                </td>
                                <td class="text-end" style="padding-right: 1.25rem; white-space: nowrap;">
                                    <a href="tablet_form.php?edit=<?= (int)$t['id'] ?>"
                                       class="btn btn-icon-primary btn-sm" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </a>
                                    <a href="index.php?delete=<?= (int)$t['id'] ?>"
                                       class="btn btn-icon-danger btn-sm" title="Delete"
                                       onclick="return confirm('Delete this tablet record?');">
                                        <i class="bi bi-trash"></i>
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
