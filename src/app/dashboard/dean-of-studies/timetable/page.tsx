'use client';

// The timetable workspace is identical for every role that manages it — the
// principal, vice-principal and super-manager copies are byte-for-byte the
// same. Rather than add a fourth copy to keep in sync, the Dean of Studies
// reuses the vice-principal one.
export { default } from '@/app/dashboard/vice-principal/timetable/page';
