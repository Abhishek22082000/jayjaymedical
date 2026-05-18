<?php
/**
 * Build a compact pagination URL for the current page.
 * Strips `page` from existing query and adds the given one.
 */
function pageUrl(int $page, array $exclude = ['page']): string {
    $params = $_GET;
    foreach ($exclude as $k) unset($params[$k]);
    $params['page'] = $page;
    return '?' . http_build_query($params);
}

/**
 * Returns the page numbers to render with ellipsis markers ('...').
 * Always shows: 1, last, current, current-1, current+1.
 */
function pageLinks(int $current, int $last): array {
    if ($last <= 1) return [1];
    $set = [1, $last, $current, $current - 1, $current + 1];
    $set = array_filter($set, fn($n) => $n >= 1 && $n <= $last);
    $set = array_values(array_unique($set));
    sort($set);

    $out = [];
    $prev = 0;
    foreach ($set as $n) {
        if ($prev && $n - $prev > 1) $out[] = '...';
        $out[] = $n;
        $prev = $n;
    }
    return $out;
}

/**
 * Render the pager. $total is the total record count, $page the current page (1-based).
 */
function renderPager(int $total, int $page, int $perPage): void {
    if ($total <= 0) return;
    $last = max(1, (int)ceil($total / $perPage));
    $from = ($page - 1) * $perPage + 1;
    $to   = min($total, $page * $perPage);
    ?>
    <div class="pager">
        <div class="pager__info">
            Showing <strong><?= $from ?>&ndash;<?= $to ?></strong> of <strong><?= $total ?></strong>
        </div>

        <?php if ($page > 1): ?>
            <a href="<?= h(pageUrl($page - 1)) ?>" title="Previous">
                <i class="bi bi-chevron-left"></i>
            </a>
        <?php else: ?>
            <span class="pager__page pager__page--disabled"><i class="bi bi-chevron-left"></i></span>
        <?php endif; ?>

        <?php foreach (pageLinks($page, $last) as $token): ?>
            <?php if ($token === '...'): ?>
                <span class="pager__ellipsis">&hellip;</span>
            <?php elseif ($token === $page): ?>
                <span class="pager__page pager__page--current"><?= $token ?></span>
            <?php else: ?>
                <a href="<?= h(pageUrl((int)$token)) ?>"><?= $token ?></a>
            <?php endif; ?>
        <?php endforeach; ?>

        <?php if ($page < $last): ?>
            <a href="<?= h(pageUrl($page + 1)) ?>" title="Next">
                <i class="bi bi-chevron-right"></i>
            </a>
        <?php else: ?>
            <span class="pager__page pager__page--disabled"><i class="bi bi-chevron-right"></i></span>
        <?php endif; ?>
    </div>
    <?php
}
