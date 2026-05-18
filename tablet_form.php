<?php
require __DIR__ . '/db.php';

$data = [
    'client_name'        => '',
    'tablet_name'        => '',
    'manufacturer'       => '',
    'batch_number'       => '',
    'quantity'           => '',
    'start_date'         => '',
    'manufacturing_date' => '',
    'end_date'           => '',
];
$errors = [];

$editId = isset($_GET['edit']) ? (int)$_GET['edit'] : 0;
if ($editId && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    $stmt = $pdo->prepare('SELECT * FROM tablets WHERE id = ?');
    $stmt->execute([$editId]);
    $row = $stmt->fetch();
    if ($row) {
        $data = [
            'client_name'        => $row['client_name'],
            'tablet_name'        => $row['tablet_name'],
            'manufacturer'       => $row['manufacturer'],
            'batch_number'       => $row['batch_number'],
            'quantity'           => $row['quantity'],
            'start_date'         => $row['start_date'],
            'manufacturing_date' => $row['manufacturing_date'],
            'end_date'           => $row['end_date'],
        ];
    } else {
        $editId = 0;
    }
}

$manufacturers = $pdo->query("SELECT DISTINCT manufacturer FROM tablets WHERE manufacturer <> '' ORDER BY manufacturer ASC")->fetchAll(PDO::FETCH_COLUMN);
$tabletNames   = $pdo->query("SELECT DISTINCT tablet_name  FROM tablets ORDER BY tablet_name ASC")->fetchAll(PDO::FETCH_COLUMN);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    foreach ($data as $key => $_) {
        $data[$key] = trim($_POST[$key] ?? '');
    }
    $editId = isset($_POST['edit_id']) ? (int)$_POST['edit_id'] : 0;

    if ($data['client_name']  === '')  $errors['client_name']  = 'Client name is required.';
    if ($data['tablet_name']  === '')  $errors['tablet_name']  = 'Tablet name is required.';
    if ($data['manufacturer'] === '')  $errors['manufacturer'] = 'Manufacturer is required.';
    if ($data['batch_number'] === '')  $errors['batch_number'] = 'Batch number is required.';

    if ($data['quantity'] === '' || !ctype_digit((string)$data['quantity']) || (int)$data['quantity'] < 1) {
        $errors['quantity'] = 'Enter a quantity of 1 or more.';
    }

    if ($data['start_date'] === '')    $errors['start_date'] = 'Start date is required.';
    if ($data['end_date']   === '')    $errors['end_date']   = 'Expiry date is required.';

    if (!isset($errors['end_date']) && !isset($errors['start_date'])
        && strtotime($data['end_date']) < strtotime($data['start_date'])) {
        $errors['end_date'] = 'Expiry date cannot be earlier than the start date.';
    }

    if ($data['manufacturing_date'] !== ''
        && !isset($errors['end_date'])
        && strtotime($data['manufacturing_date']) > strtotime($data['end_date'])) {
        $errors['manufacturing_date'] = 'Manufacturing date cannot be after the expiry date.';
    }

    if (!$errors) {
        $mfg = $data['manufacturing_date'] !== '' ? $data['manufacturing_date'] : null;

        if ($editId) {
            $stmt = $pdo->prepare(
                'UPDATE tablets
                   SET client_name = ?, tablet_name = ?, manufacturer = ?, batch_number = ?,
                       quantity = ?, start_date = ?, manufacturing_date = ?, end_date = ?
                 WHERE id = ?'
            );
            $stmt->execute([
                $data['client_name'], $data['tablet_name'], $data['manufacturer'], $data['batch_number'],
                (int)$data['quantity'], $data['start_date'], $mfg, $data['end_date'], $editId,
            ]);
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO tablets
                    (client_name, tablet_name, manufacturer, batch_number, quantity, start_date, manufacturing_date, end_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $data['client_name'], $data['tablet_name'], $data['manufacturer'], $data['batch_number'],
                (int)$data['quantity'], $data['start_date'], $mfg, $data['end_date'],
            ]);
        }
        header('Location: index.php?saved=1');
        exit;
    }
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= $editId ? 'Edit Tablet' : 'Add Tablet' ?> &mdash; JAY-JAY MEDICAL</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

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
            <a href="grouped.php" class="btn btn-ghost btn-sm">
                <i class="bi bi-collection"></i> <span class="d-none d-sm-inline">By Tablet</span>
            </a>
        </div>
    </div>
</nav>

<div class="form-page">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-12 col-md-10 col-lg-9 col-xl-8">

                <div class="page-strip">
                    <h1><?= $editId ? 'Edit Tablet Record' : 'Register New Tablet' ?></h1>
                    <p><?= $editId ? 'Update the tablet details below.' : 'Add a new tablet with batch, quantity and expiry information.' ?></p>
                </div>

                <div class="surface p-4">
                    <form method="post" novalidate>
                        <?php if ($editId): ?>
                            <input type="hidden" name="edit_id" value="<?= (int)$editId ?>">
                        <?php endif; ?>

                        <h6 class="text-uppercase fw-semibold mb-3" style="color: var(--c-text-muted); font-size: .75rem; letter-spacing: .08em;">
                            Tablet Information
                        </h6>

                        <div class="row g-3">
                            <div class="col-12 col-md-6">
                                <label for="tablet_name" class="field-label">
                                    <i class="bi bi-capsule-pill"></i> Tablet Name
                                </label>
                                <input type="text" id="tablet_name" name="tablet_name" list="dl-tablets"
                                       class="form-control <?= isset($errors['tablet_name']) ? 'is-invalid' : '' ?>"
                                       value="<?= h($data['tablet_name']) ?>" placeholder="e.g. Paracetamol 500mg">
                                <datalist id="dl-tablets">
                                    <?php foreach ($tabletNames as $tn): ?>
                                        <option value="<?= h($tn) ?>">
                                    <?php endforeach; ?>
                                </datalist>
                                <?php if (isset($errors['tablet_name'])): ?>
                                    <div class="invalid-feedback d-block"><?= h($errors['tablet_name']) ?></div>
                                <?php endif; ?>
                            </div>

                            <div class="col-12 col-md-6">
                                <label for="manufacturer" class="field-label">
                                    <i class="bi bi-building"></i> Manufacturer
                                </label>
                                <input type="text" id="manufacturer" name="manufacturer" list="dl-manufacturers"
                                       class="form-control <?= isset($errors['manufacturer']) ? 'is-invalid' : '' ?>"
                                       value="<?= h($data['manufacturer']) ?>" placeholder="e.g. Cipla, Sun Pharma">
                                <datalist id="dl-manufacturers">
                                    <?php foreach ($manufacturers as $m): ?>
                                        <option value="<?= h($m) ?>">
                                    <?php endforeach; ?>
                                </datalist>
                                <?php if (isset($errors['manufacturer'])): ?>
                                    <div class="invalid-feedback d-block"><?= h($errors['manufacturer']) ?></div>
                                <?php endif; ?>
                            </div>

                            <div class="col-12 col-md-7">
                                <label for="batch_number" class="field-label">
                                    <i class="bi bi-upc-scan"></i> Batch Number
                                </label>
                                <div class="input-group">
                                    <span class="input-group-text">#</span>
                                    <input type="text" id="batch_number" name="batch_number"
                                           class="form-control <?= isset($errors['batch_number']) ? 'is-invalid' : '' ?>"
                                           value="<?= h($data['batch_number']) ?>" placeholder="e.g. BN-2026-00471">
                                </div>
                                <?php if (isset($errors['batch_number'])): ?>
                                    <div class="invalid-feedback d-block"><?= h($errors['batch_number']) ?></div>
                                <?php endif; ?>
                            </div>

                            <div class="col-12 col-md-5">
                                <label for="quantity" class="field-label">
                                    <i class="bi bi-stack"></i> Quantity (strips / units)
                                </label>
                                <input type="number" id="quantity" name="quantity" min="1" step="1"
                                       class="form-control <?= isset($errors['quantity']) ? 'is-invalid' : '' ?>"
                                       value="<?= h($data['quantity']) ?>" placeholder="e.g. 100">
                                <?php if (isset($errors['quantity'])): ?>
                                    <div class="invalid-feedback d-block"><?= h($errors['quantity']) ?></div>
                                <?php endif; ?>
                            </div>
                        </div>

                        <hr class="my-4" style="border-color: var(--c-border);">

                        <h6 class="text-uppercase fw-semibold mb-3" style="color: var(--c-text-muted); font-size: .75rem; letter-spacing: .08em;">
                            Client &amp; Dates
                        </h6>

                        <div class="row g-3">
                            <div class="col-12">
                                <label for="client_name" class="field-label">
                                    <i class="bi bi-person"></i> Client Name
                                </label>
                                <input type="text" id="client_name" name="client_name"
                                       class="form-control <?= isset($errors['client_name']) ? 'is-invalid' : '' ?>"
                                       value="<?= h($data['client_name']) ?>" placeholder="e.g. John Doe">
                                <?php if (isset($errors['client_name'])): ?>
                                    <div class="invalid-feedback d-block"><?= h($errors['client_name']) ?></div>
                                <?php endif; ?>
                            </div>

                            <div class="col-12 col-md-4">
                                <label for="manufacturing_date" class="field-label">
                                    <i class="bi bi-tools"></i> Mfg. Date <span style="color: var(--c-text-soft); font-weight: 400;">(optional)</span>
                                </label>
                                <input type="date" id="manufacturing_date" name="manufacturing_date"
                                       class="form-control <?= isset($errors['manufacturing_date']) ? 'is-invalid' : '' ?>"
                                       value="<?= h($data['manufacturing_date']) ?>">
                                <?php if (isset($errors['manufacturing_date'])): ?>
                                    <div class="invalid-feedback d-block"><?= h($errors['manufacturing_date']) ?></div>
                                <?php endif; ?>
                            </div>

                            <div class="col-12 col-md-4">
                                <label for="start_date" class="field-label">
                                    <i class="bi bi-calendar-plus"></i> Purchase / Start Date
                                </label>
                                <input type="date" id="start_date" name="start_date"
                                       class="form-control <?= isset($errors['start_date']) ? 'is-invalid' : '' ?>"
                                       value="<?= h($data['start_date']) ?>">
                                <?php if (isset($errors['start_date'])): ?>
                                    <div class="invalid-feedback d-block"><?= h($errors['start_date']) ?></div>
                                <?php endif; ?>
                            </div>

                            <div class="col-12 col-md-4">
                                <label for="end_date" class="field-label">
                                    <i class="bi bi-calendar-x"></i> Expiry Date
                                </label>
                                <input type="date" id="end_date" name="end_date"
                                       class="form-control <?= isset($errors['end_date']) ? 'is-invalid' : '' ?>"
                                       value="<?= h($data['end_date']) ?>">
                                <?php if (isset($errors['end_date'])): ?>
                                    <div class="invalid-feedback d-block"><?= h($errors['end_date']) ?></div>
                                <?php endif; ?>
                            </div>
                        </div>

                        <div class="d-flex flex-column flex-sm-row gap-2 justify-content-end pt-4 mt-2">
                            <a href="index.php" class="btn btn-ghost">
                                <i class="bi bi-x-lg"></i> Cancel
                            </a>
                            <button type="submit" class="btn btn-brand">
                                <i class="bi bi-check2"></i>
                                <?= $editId ? 'Update Tablet' : 'Save Tablet' ?>
                            </button>
                        </div>
                    </form>
                </div>

                <p class="text-center small mt-4" style="color: var(--c-text-soft);">
                    &copy; <?= date('Y') ?> JAY-JAY MEDICAL &middot; All rights reserved
                </p>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
