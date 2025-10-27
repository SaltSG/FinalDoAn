import { Card, Space, Typography, Select, InputNumber, Tag, Divider } from 'antd';
import { useMemo, useState } from 'react';
import { letterFrom10, fourFrom10, type Letter } from '../lib/grading';

type WeightOption = { label: string; weights: number[] };

const WEIGHT_OPTIONS: WeightOption[] = [
  { label: '10-20-20-50', weights: [10, 20, 20, 50] },
  { label: '10-10-30-50', weights: [10, 10, 30, 50] },
  { label: '10-10-20-60', weights: [10, 10, 20, 60] },
  { label: '10-10-10-70', weights: [10, 10, 10, 70] },
  { label: '10-30-60', weights: [10, 30, 60] },
  { label: '10-20-70', weights: [10, 20, 70] },
  { label: '10-10-80', weights: [10, 10, 80] },
];

export default function SummaryPage() {
  const [weightKey, setWeightKey] = useState<string>(WEIGHT_OPTIONS[2].label);

  const weights = useMemo(() => WEIGHT_OPTIONS.find((w) => w.label === weightKey)?.weights ?? WEIGHT_OPTIONS[0].weights, [weightKey]);
  const [scores, setScores] = useState<number[]>(() => new Array(weights.length).fill(undefined as unknown as number));

  // reset scores if structure changes
  const onChangeWeights = (label: string) => {
    setWeightKey(label);
    const next = WEIGHT_OPTIONS.find((w) => w.label === label)?.weights ?? [];
    setScores(new Array(next.length).fill(undefined as unknown as number));
  };

  const total = useMemo(() => {
    let sum = 0;
    weights.forEach((w, idx) => {
      const s = scores[idx];
      if (typeof s === 'number') {
        sum += (s * w) / 100;
      }
    });
    return Math.round((sum + Number.EPSILON) * 100) / 100;
  }, [scores, weights]);

  const letter = useMemo(() => (letterFrom10(isFinite(total) ? total : 0) as Letter), [total]);
  const four = useMemo(() => fourFrom10(isFinite(total) ? total : 0) ?? 0, [total]);
  const [convert10, setConvert10] = useState<number | undefined>(undefined);
  const convert4 = useMemo(() => (convert10 !== undefined ? (fourFrom10(convert10) ?? 0) : undefined), [convert10]);
  const convertLetter = useMemo(() => (convert10 !== undefined ? (letterFrom10(convert10) as Letter) : undefined), [convert10]);

  const shown10 = convert10 ?? 0;
  const shown4 = convert10 !== undefined ? (convert4 ?? 0) : 0;
  const shownLetter = convert10 !== undefined ? (convertLetter as Letter) : ('F' as Letter);

  return (
    <div className="container">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Typography.Title level={4} style={{ color: 'var(--color-secondary)', marginBottom: 0 }}>
          Tính điểm môn
        </Typography.Title>

        <Card>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <div>
                <Typography.Title level={5} style={{ color: 'var(--color-secondary)', marginBottom: 6 }}>Chọn cấu trúc điểm của môn học</Typography.Title>
                <Select
                  value={weightKey}
                  onChange={onChangeWeights}
                  options={WEIGHT_OPTIONS.map((w) => ({ label: w.label, value: w.label }))}
                  style={{ minWidth: 280 }}
                />
              </div>
            </Space>

            <Divider style={{ margin: '8px 0' }} />

            <div className="calc-grid">
              <div className="calc-header" style={{ gridTemplateColumns: `repeat(${weights.length}, 1fr) 180px` }}>
                {weights.map((w, i) => (
                  <div key={`h-${i}`}>Điểm {w}%</div>
                ))}
                <div className="calc-total">Tổng kết</div>
              </div>
              <div className="calc-row" style={{ gridTemplateColumns: `repeat(${weights.length}, 1fr) 180px` }}>
                {weights.map((w, i) => (
                  <div key={`r-${i}`}>
                    <InputNumber
                      placeholder={`Điểm ${w}%`}
                      min={0}
                      max={10}
                      step={0.1}
                      value={scores[i] as number | undefined}
                      onChange={(v) => setScores((prev) => {
                        const next = [...prev];
                        next[i] = typeof v === 'number' ? v : (undefined as unknown as number);
                        return next;
                      })}
                      style={{ width: '100%' }}
                    />
                  </div>
                ))}
                <div className="calc-total">
                  <Space>
                    <Typography.Text strong style={{ fontSize: 18, color: 'var(--color-secondary)' }}>{total.toFixed(2)}</Typography.Text>
                    <Tag color="blue" style={{ fontWeight: 700 }}>{letter}</Tag>
                  </Space>
                </div>
              </div>
            </div>

            <Divider style={{ margin: '8px 0' }} />
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Typography.Title level={5} style={{ color: 'var(--color-secondary)', marginBottom: 0 }}>
                Quy đổi hệ 10 → hệ 4
              </Typography.Title>
              <div className="convert-panel">
                <div className="convert-header">
                  <div>Điểm hệ 10</div>
                  <div>Điểm hệ 4</div>
                  <div>Thang điểm chữ</div>
                </div>
                <div className="convert-row">
                  <div>
                    <InputNumber
                      placeholder="Điểm hệ 10"
                      min={0}
                      max={10}
                      step={0.1}
                      value={convert10}
                      onChange={(v) => setConvert10(typeof v === 'number' ? v : undefined)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>{convert10 !== undefined ? (convert4 ?? 0).toFixed(2) : 0}</div>
                  <div>{convert10 !== undefined ? (convertLetter as Letter) : 'F'}</div>
                </div>
              </div>
            </Space>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
