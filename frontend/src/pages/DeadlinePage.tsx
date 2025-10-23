import { useState } from 'react';
import { Button, Card, DatePicker, Form, Input, Select, Space, TimePicker, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

type DeadlineFormValues = {
  subject: string;
  title: string;
  startDate?: Dayjs;
  startTime?: Dayjs;
  endDate?: Dayjs;
  endTime?: Dayjs;
  note?: string;
};

const SUBJECTS = [
  { value: 'mm101', label: 'MM101 - Nhập môn Multimedia' },
  { value: 'mm202', label: 'MM202 - Thiết kế đồ họa' },
  { value: 'mm303', label: 'MM303 - Biên tập video' }
];

export default function DeadlinePage() {
  const [form] = Form.useForm<DeadlineFormValues>();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: DeadlineFormValues) => {
    setSubmitting(true);
    try {
      // Compose ISO strings for backend later
      const start = mergeDateTime(values.startDate, values.startTime);
      const end = mergeDateTime(values.endDate, values.endTime);
      const payload = {
        subject: values.subject,
        title: values.title,
        startAt: start?.toISOString() ?? null,
        endAt: end?.toISOString() ?? null,
        note: values.note ?? ''
      };
      // TODO: integrate POST /api/deadlines later
      // await fetch('/api/deadlines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      // For now, just log
      // eslint-disable-next-line no-console
      console.log('deadline.create', payload);
      form.resetFields();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <Typography.Title level={3} style={{ color: 'var(--color-secondary)', marginBottom: 16 }}>Tạo deadline môn học</Typography.Title>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card>
          <Form form={form} layout="vertical" onFinish={onSubmit}>
            <Form.Item name="subject" label="Môn học" rules={[{ required: true, message: 'Chọn môn học' }]}>
              <Select placeholder="Chọn môn" options={SUBJECTS} showSearch allowClear />
            </Form.Item>

            <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
              <Input placeholder="Ví dụ: Bài tập chương 2" />
            </Form.Item>

            <Space size={16} style={{ width: '100%' }} wrap>
              <Form.Item name="startDate" label="Ngày bắt đầu">
                <DatePicker format="DD/MM/YYYY" />
              </Form.Item>
              <Form.Item name="startTime" label="Giờ bắt đầu">
                <TimePicker format="HH:mm" minuteStep={5} />
              </Form.Item>
            </Space>

            <Space size={16} style={{ width: '100%' }} wrap>
              <Form.Item name="endDate" label="Ngày kết thúc">
                <DatePicker format="DD/MM/YYYY" />
              </Form.Item>
              <Form.Item name="endTime" label="Giờ kết thúc">
                <TimePicker format="HH:mm" minuteStep={5} />
              </Form.Item>
            </Space>

            <Form.Item name="note" label="Ghi chú">
              <Input.TextArea rows={3} placeholder="Yêu cầu nộp bài, link tham khảo..." />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={submitting}>Lưu deadline</Button>
                <Button htmlType="button" onClick={() => form.resetFields()}>Xóa</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </div>
  );
}

function mergeDateTime(date?: Dayjs, time?: Dayjs) {
  if (!date && !time) return undefined;
  const d = date ?? dayjs();
  const t = time ?? dayjs().startOf('day');
  return d.hour(t.hour()).minute(t.minute()).second(0).millisecond(0);
}


