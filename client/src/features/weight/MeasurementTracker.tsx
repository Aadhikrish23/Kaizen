import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { useMeasurements, useUpsertMeasurement } from '../../services/measurementService';
import { Save } from 'lucide-react';

interface MeasurementTrackerProps {
  currentDate: string;
}

export const MeasurementTracker: React.FC<MeasurementTrackerProps> = ({ currentDate }) => {
  const { data, isLoading } = useMeasurements(currentDate);
  const { mutateAsync: upsert } = useUpsertMeasurement();

  const [formData, setFormData] = useState({
    bodyFatPercentage: '',
    chestCm: '',
    waistCm: '',
    hipsCm: '',
    armsCm: '',
    legsCm: ''
  });

  useEffect(() => {
    if (data && data.length > 0) {
      const m = data[0];
      setFormData({
        bodyFatPercentage: m.bodyFatPercentage?.toString() || '',
        chestCm: m.chestCm?.toString() || '',
        waistCm: m.waistCm?.toString() || '',
        hipsCm: m.hipsCm?.toString() || '',
        armsCm: m.armsCm?.toString() || '',
        legsCm: m.legsCm?.toString() || ''
      });
    } else {
      setFormData({
        bodyFatPercentage: '',
        chestCm: '',
        waistCm: '',
        hipsCm: '',
        armsCm: '',
        legsCm: ''
      });
    }
  }, [data, currentDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    const payload: any = { date: currentDate };
    Object.keys(formData).forEach(key => {
      const val = (formData as any)[key];
      if (val !== '') payload[key] = Number(val);
    });

    try {
      await upsert(payload);
      alert('Measurements saved successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to save measurements');
    }
  };

  if (isLoading) return <LoadingState message="Loading measurements..." />;

  return (
    <Card title="Body Measurements" subtitle="Track your physical changes (cm)">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input label="Body Fat %" name="bodyFatPercentage" type="number" suffix="%" value={formData.bodyFatPercentage} onChange={handleChange} />
        <Input label="Chest" name="chestCm" type="number" suffix="cm" value={formData.chestCm} onChange={handleChange} />
        <Input label="Waist" name="waistCm" type="number" suffix="cm" value={formData.waistCm} onChange={handleChange} />
        <Input label="Hips" name="hipsCm" type="number" suffix="cm" value={formData.hipsCm} onChange={handleChange} />
        <Input label="Arms" name="armsCm" type="number" suffix="cm" value={formData.armsCm} onChange={handleChange} />
        <Input label="Legs" name="legsCm" type="number" suffix="cm" value={formData.legsCm} onChange={handleChange} />
      </div>
      <Button variant="primary" onClick={handleSave} className="w-full">
        <Save className="w-4 h-4 mr-2" /> Save Measurements
      </Button>
    </Card>
  );
};
