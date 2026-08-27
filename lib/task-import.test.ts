import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTaskViewRows, formatExcelDate } from './task-import';

test('formatExcelDate formats Date instances correctly', () => {
  const d = new Date(2026, 4, 15); // 15/05/2026
  assert.equal(formatExcelDate(d), '15/05/2026');
});

test('formatExcelDate handles string notes or natural deadlines', () => {
  assert.equal(formatExcelDate('trước tháng 5'), 'trước tháng 5');
  assert.equal(formatExcelDate(null), null);
});

test('parseTaskViewRows maps status and columns accurately', () => {
  const rows = [
    ['No.', 'Tình trạng', 'Deadline', 'Công việc', 'Chi tiết', 'Name', 'File hoàn thành (nếu có)', 'Nguồn ', 'Nguồn 2'],
    [1, 'Đã hoàn thành', new Date(2026, 5, 2), 'Chốt sản phẩm', 'Chốt giá vải', 'Hà', 'Xong', 'https://example.com', null],
    [2, 'Đang thực thi', '25/2', 'Launching', 'Bài post', 'Ngọc', null, null, null],
  ];

  const tasks = parseTaskViewRows(rows);
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].stt, 1);
  assert.equal(tasks[0].status, 'Đã hoàn thành');
  assert.equal(tasks[0].deadline, '02/06/2026');
  assert.equal(tasks[0].assignee, 'Hà');
  assert.equal(tasks[0].sources.length, 1);
  assert.equal(tasks[0].sources[0], 'https://example.com');

  assert.equal(tasks[1].stt, 2);
  assert.equal(tasks[1].status, 'Đang thực thi');
  assert.equal(tasks[1].deadline, '25/2');
  assert.equal(tasks[1].assignee, 'Ngọc');
});
