import test from 'node:test';
import assert from 'node:assert/strict';
import DOMPurify from 'isomorphic-dompurify';

test('server sanitizer loads through CommonJS and preserves gap markup while stripping executable HTML', () => {
 const clean = DOMPurify.sanitize('<p>Complete [gap1] <strong>carefully</strong></p><img src="x" onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">link</a>');
 assert.match(clean, /Complete \[gap1\]/);
 assert.match(clean, /<strong>carefully<\/strong>/);
 assert.doesNotMatch(clean, /onerror|<script|javascript:/i);
});
