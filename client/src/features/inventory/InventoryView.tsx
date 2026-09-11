import React, { useState } from 'react';
import {
  Dumbbell,
  Plus,
  Trash2,
  Check,
  Package,
  TrendingUp,
  Layers,
  Save,
  Info,
  Pencil,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import {
  useInventory,
  useUpdateInventory,
  useUpdateWorkingWeight,
} from '../../services/inventoryService';
import { EquipmentItem } from '../../types';

const PRESETS: { id: string; name: string; description: string; items: EquipmentItem[] }[] = [
  {
    id: 'home-dumbbells',
    name: 'Home Dumbbell Starter',
    description: 'Adjustable dumbbells, incline bench, resistance bands, and pull-up bar',
    items: [
      {
        id: 'db-1',
        type: 'dumbbell',
        name: 'Adjustable Dumbbells Set',
        availableWeightsKg: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20],
        notes: 'Spinlock pairs up to 20kg each',
      },
      {
        id: 'bench-1',
        type: 'bench',
        name: 'Adjustable Incline / Flat Bench',
        availableWeightsKg: [],
        notes: 'Flat to 90 degrees incline',
      },
      {
        id: 'bands-1',
        type: 'bands',
        name: 'Resistance Bands Loop Set',
        availableWeightsKg: [5, 10, 15, 20],
        notes: 'Light, medium, heavy bands',
      },
      {
        id: 'pullup-1',
        type: 'pullup_bar',
        name: 'Doorway Pull-up Bar',
        availableWeightsKg: [],
        notes: 'Home door frame mount',
      },
    ],
  },
  {
    id: 'commercial-gym',
    name: 'Full Commercial Gym Access',
    description: 'Full dumbbell rack, olympic barbells, cables, and pin-loaded machines',
    items: [
      {
        id: 'gym-db',
        type: 'dumbbell',
        name: 'Full Dumbbell Rack (2.5kg - 50kg)',
        availableWeightsKg: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 35, 40, 45, 50],
        notes: '2.5kg increments',
      },
      {
        id: 'gym-barbell',
        type: 'barbell',
        name: 'Olympic Barbell & Bumper/Iron Plates',
        availableWeightsKg: [],
        platePairsKg: [1.25, 2.5, 5, 10, 15, 20, 25],
        barbellWeightKg: 20,
        notes: 'Standard 20kg Olympic barbell',
      },
      {
        id: 'gym-cables',
        type: 'cable',
        name: 'Dual Adjustable Cable Tower',
        availableWeightsKg: [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80],
        notes: 'Rope, straight bar, D-handles',
      },
      {
        id: 'gym-bench',
        type: 'bench',
        name: 'Commercial Benches & Squat Racks',
        availableWeightsKg: [],
        notes: 'Flat, incline, decline benches + power cages',
      },
      {
        id: 'gym-machines',
        type: 'machine',
        name: 'Pin & Plate-Loaded Gym Machines',
        availableWeightsKg: [15, 25, 35, 45, 55, 65, 75, 85, 100],
        notes: 'Leg press, leg curl, lat pulldown, chest press',
      },
    ],
  },
  {
    id: 'minimalist-bodyweight',
    name: 'Minimalist & Calisthenics',
    description: 'Doorway pullup bar, resistance bands, and bodyweight floor work',
    items: [
      {
        id: 'bw-pullup',
        type: 'pullup_bar',
        name: 'Doorway Pull-up & Dip Station',
        availableWeightsKg: [],
        notes: 'Pull-ups, chin-ups, hanging leg raises',
      },
      {
        id: 'bw-bands',
        type: 'bands',
        name: 'Heavy Resistance Loop Bands',
        availableWeightsKg: [5, 10, 15, 25, 35],
        notes: 'Assistance for pull-ups and banded squats',
      },
    ],
  },
];

export const InventoryView: React.FC = () => {
  const { data: inventory } = useInventory();
  const { mutateAsync: updateInventory, isPending: isUpdating } = useUpdateInventory();
  const { mutateAsync: updateWorkingWeight } = useUpdateWorkingWeight();

  const [activeTab, setActiveTab] = useState<'equipment' | 'working-weights'>('equipment');
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New custom item state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<EquipmentItem['type']>('dumbbell');
  const [newItemWeights, setNewItemWeights] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');

  // Equipment item editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemType, setEditItemType] = useState<EquipmentItem['type']>('dumbbell');
  const [editItemWeights, setEditItemWeights] = useState('');
  const [editItemNotes, setEditItemNotes] = useState('');
  const [editPlatePairs, setEditPlatePairs] = useState('');
  const [editBarbellWeight, setEditBarbellWeight] = useState('20');

  // Working weight quick editor state
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editReps, setEditReps] = useState('10');
  const [editRpe, setEditRpe] = useState('8');

  // Sync state with inventory data
  if (inventory?.equipment && !isInitialized) {
    setEquipmentList(inventory.equipment);
    setIsInitialized(true);
  }

  const handleStartEditItem = (item: EquipmentItem) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemType(item.type);
    setEditItemWeights(item.availableWeightsKg?.join(', ') || '');
    setEditItemNotes(item.notes || '');
    setEditPlatePairs(item.platePairsKg?.join(', ') || '');
    setEditBarbellWeight(item.barbellWeightKg?.toString() || '20');
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
  };

  const handleSaveEditItem = async (id: string) => {
    if (!editItemName.trim()) return;

    const weightsParsed = editItemWeights
      .split(',')
      .map((w) => parseFloat(w.trim()))
      .filter((w) => !isNaN(w) && w > 0);

    const platePairsParsed = editPlatePairs
      .split(',')
      .map((w) => parseFloat(w.trim()))
      .filter((w) => !isNaN(w) && w > 0);

    const barbellWeightParsed = parseFloat(editBarbellWeight) || 20;

    const updatedList = equipmentList.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          name: editItemName.trim(),
          type: editItemType,
          availableWeightsKg: weightsParsed,
          platePairsKg: platePairsParsed.length > 0 ? platePairsParsed : undefined,
          barbellWeightKg: editItemType === 'barbell' ? barbellWeightParsed : undefined,
          notes: editItemNotes.trim() || undefined,
        };
      }
      return item;
    });

    setEquipmentList(updatedList);
    setEditingItemId(null);
    await updateInventory(updatedList);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleApplyPreset = async (preset: typeof PRESETS[0]) => {
    setEquipmentList(preset.items);
    await updateInventory(preset.items);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSaveEquipment = async () => {
    await updateInventory(equipmentList);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleRemoveItem = (id: string) => {
    const updated = equipmentList.filter((item) => item.id !== id);
    setEquipmentList(updated);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const weightsParsed = newItemWeights
      .split(',')
      .map((w) => parseFloat(w.trim()))
      .filter((w) => !isNaN(w) && w > 0);

    const newItem: EquipmentItem = {
      id: `custom-${Date.now()}`,
      type: newItemType,
      name: newItemName.trim(),
      availableWeightsKg: weightsParsed,
      notes: newItemNotes.trim() || undefined,
    };

    setEquipmentList([...equipmentList, newItem]);
    setNewItemName('');
    setNewItemWeights('');
    setNewItemNotes('');
    setShowAddForm(false);
  };

  const handleSaveWorkingWeight = async (exerciseName: string) => {
    const weight = parseFloat(editWeight);
    const reps = parseInt(editReps, 10);
    const rpe = parseFloat(editRpe);
    if (isNaN(weight) || weight < 0) return;

    await updateWorkingWeight({
      exerciseName,
      currentWeightKg: weight,
      targetReps: isNaN(reps) ? 10 : reps,
      rpe: isNaN(rpe) ? undefined : rpe,
      date: new Date().toISOString().split('T')[0],
    });

    setEditingExercise(null);
  };

  const workingWeights = inventory?.workingWeights || [];
  const totalEquipmentCount = equipmentList.length;
  const heaviestWorkingWeight = workingWeights.reduce(
    (max, item) => Math.max(max, item.currentWeightKg),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-kaizen-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-control bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-white">
                Hardware Arsenal & Inventory
                <span className="sr-only">Gym & Equipment Inventory</span>
              </h1>
              <p className="text-xs text-kaizen-muted font-mono">Equipment catalog & baseline progressive overload telemetry</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded">
              <Check className="w-3.5 h-3.5" /> Inventory Synchronized
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveEquipment}
            disabled={isUpdating}
            className="gap-1.5 font-semibold shadow-glow-emerald"
          >
            <Save className="w-4 h-4" />
            {isUpdating ? 'Saving...' : 'Save Arsenal'}
            <span className="sr-only">Save Inventory</span>
          </Button>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-kaizen-surface border border-kaizen-border rounded-structural flex items-center justify-between card-sheen shadow-subtle">
          <div>
            <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider block">Equipment Units</span>
            <span className="text-3xl font-bold font-mono text-amber-400 mt-0.5 block">{totalEquipmentCount}</span>
          </div>
          <div className="w-10 h-10 rounded-control bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shadow-sm">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-kaizen-surface border border-kaizen-border rounded-structural flex items-center justify-between card-sheen shadow-subtle">
          <div>
            <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider block">Calibrated Movements</span>
            <span className="text-3xl font-bold font-mono text-emerald-400 mt-0.5 block">{workingWeights.length}</span>
          </div>
          <div className="w-10 h-10 rounded-control bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-glow-emerald">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-kaizen-surface border border-kaizen-border rounded-structural flex items-center justify-between card-sheen shadow-subtle">
          <div>
            <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider block">Max Working Load</span>
            <span className="text-3xl font-bold font-mono text-rose-400 mt-0.5 block">{heaviestWorkingWeight} <span className="text-xs text-kaizen-muted font-normal">kg</span></span>
          </div>
          <div className="w-10 h-10 rounded-control bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-sm">
            <Dumbbell className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-kaizen-surface border border-kaizen-border rounded-control shadow-subtle">
        <button
          onClick={() => setActiveTab('equipment')}
          className={`px-4 py-2 rounded-control text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'equipment'
              ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30 shadow-sm'
              : 'text-kaizen-muted hover:text-white hover:bg-kaizen-surface-hover/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          Hardware Arsenal ({equipmentList.length})
        </button>
        <button
          onClick={() => setActiveTab('working-weights')}
          className={`px-4 py-2 rounded-control text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'working-weights'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-kaizen-muted hover:text-white hover:bg-kaizen-surface-hover/50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          Working Weights & Baseline ({workingWeights.length})
        </button>
      </div>

      {/* Tab 1: Equipment */}
      {activeTab === 'equipment' && (
        <div className="space-y-6">
          {/* Preset Quick Load */}
          <div className="p-4 bg-kaizen-surface/60 border border-kaizen-border rounded-structural space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-kaizen-muted uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-400" /> Quick Setup Presets
              </span>
              <span className="text-[11px] text-kaizen-subtle">Replace or bootstrap equipment list</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="p-3 bg-kaizen-bg border border-kaizen-border rounded-control hover:border-amber-400/50 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-kaizen-text">{preset.name}</h4>
                    <p className="text-[11px] text-kaizen-muted mt-1 line-clamp-2">{preset.description}</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleApplyPreset(preset)}
                    className="mt-3 text-xs w-full text-amber-400 border-amber-400/30 hover:border-amber-400"
                  >
                    Apply Preset
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-kaizen-text">Configured Equipment Items</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddForm ? 'Cancel' : 'Add Custom Equipment'}
            </Button>
          </div>

          {/* Add Item Form */}
          {showAddForm && (
            <Card className="p-4 bg-kaizen-surface border border-amber-400/30">
              <form onSubmit={handleAddItem} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-kaizen-muted block mb-1">Equipment Name</label>
                    <Input
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. Iron Master Quick-Lock Dumbbells"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-kaizen-muted block mb-1">Category / Type</label>
                    <select
                      value={newItemType}
                      onChange={(e) => setNewItemType(e.target.value as any)}
                      className="w-full bg-kaizen-bg border border-kaizen-border rounded-control px-3 py-2 text-xs font-mono text-kaizen-text focus:border-kaizen-primary outline-none"
                    >
                      <option value="dumbbell">Dumbbell Pair / Set</option>
                      <option value="barbell">Barbell & Plates</option>
                      <option value="bench">Bench (Incline/Flat)</option>
                      <option value="pullup_bar">Pull-up Bar / Dip Station</option>
                      <option value="bands">Resistance Bands</option>
                      <option value="cable">Cable Tower</option>
                      <option value="machine">Gym Machine</option>
                      <option value="kettlebell">Kettlebell</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-kaizen-muted block mb-1">
                    Available Weights in kg (comma separated)
                  </label>
                  <Input
                    value={newItemWeights}
                    onChange={(e) => setNewItemWeights(e.target.value)}
                    placeholder="e.g. 2.5, 5, 7.5, 10, 15, 20"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-kaizen-muted block mb-1">Notes / Description (optional)</label>
                  <Input
                    value={newItemNotes}
                    onChange={(e) => setNewItemNotes(e.target.value)}
                    placeholder="e.g. Incline positions: 30, 45, 60, 90 degrees"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    Add Equipment
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Equipment Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {equipmentList.map((item) => (
              <div
                key={item.id}
                className={`p-4 bg-kaizen-surface border rounded-structural flex flex-col justify-between transition-colors ${
                  editingItemId === item.id ? 'border-amber-400/60 ring-1 ring-amber-400/30' : 'border-kaizen-border hover:border-kaizen-border/80'
                }`}
              >
                {editingItemId === item.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEditItem(item.id);
                    }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-kaizen-border/60 pb-2">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <Pencil className="w-3.5 h-3.5" /> Edit Equipment
                      </span>
                      <Badge variant="amber" size="sm">Editing</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-mono text-kaizen-muted block mb-1">Equipment Name</label>
                        <Input
                          value={editItemName}
                          onChange={(e) => setEditItemName(e.target.value)}
                          placeholder="Equipment Name"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-kaizen-muted block mb-1">Category / Type</label>
                        <select
                          value={editItemType}
                          onChange={(e) => setEditItemType(e.target.value as any)}
                          className="w-full bg-kaizen-bg border border-kaizen-border rounded-control px-2.5 py-1.5 text-xs font-mono text-kaizen-text focus:border-kaizen-primary outline-none"
                        >
                          <option value="dumbbell">Dumbbell Pair / Set</option>
                          <option value="barbell">Barbell & Plates</option>
                          <option value="bench">Bench (Incline/Flat)</option>
                          <option value="pullup_bar">Pull-up Bar / Dip Station</option>
                          <option value="bands">Resistance Bands</option>
                          <option value="cable">Cable Tower</option>
                          <option value="machine">Gym Machine</option>
                          <option value="kettlebell">Kettlebell</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-kaizen-muted block mb-1">
                        Available Weights in kg (comma separated)
                      </label>
                      <Input
                        value={editItemWeights}
                        onChange={(e) => setEditItemWeights(e.target.value)}
                        placeholder="e.g. 2.5, 5, 7.5, 10, 15, 20"
                      />
                    </div>

                    {editItemType === 'barbell' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-mono text-kaizen-muted block mb-1">Barbell Weight (kg)</label>
                          <Input
                            type="number"
                            value={editBarbellWeight}
                            onChange={(e) => setEditBarbellWeight(e.target.value)}
                            placeholder="20"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-kaizen-muted block mb-1">Plate Pairs in kg</label>
                          <Input
                            value={editPlatePairs}
                            onChange={(e) => setEditPlatePairs(e.target.value)}
                            placeholder="e.g. 1.25, 2.5, 5, 10, 20"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-mono text-kaizen-muted block mb-1">Notes / Description (optional)</label>
                      <Input
                        value={editItemNotes}
                        onChange={(e) => setEditItemNotes(e.target.value)}
                        placeholder="e.g. Incline positions: 30, 45, 60, 90 degrees"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-kaizen-border/60">
                      <Button variant="ghost" size="sm" type="button" onClick={handleCancelEditItem}>
                        Cancel
                      </Button>
                      <Button variant="primary" size="sm" type="submit" className="gap-1 text-xs">
                        <Check className="w-3.5 h-3.5" /> Save Changes
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-control bg-kaizen-bg border border-kaizen-border flex items-center justify-center text-kaizen-primary">
                          <Dumbbell className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-kaizen-text">{item.name}</h4>
                          <span className="text-[10px] font-mono uppercase text-kaizen-muted">{item.type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditItem(item)}
                          className="text-kaizen-muted hover:text-amber-400 transition-colors p-1"
                          title="Edit equipment item"
                          aria-label={`Edit ${item.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-kaizen-muted hover:text-rose-400 transition-colors p-1"
                          title="Remove item"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-kaizen-muted mt-2.5 italic">{item.notes}</p>
                    )}

                    {/* Weights badges */}
                    {item.availableWeightsKg && item.availableWeightsKg.length > 0 && (
                      <div className="mt-3">
                        <span className="text-[10px] font-mono text-kaizen-subtle uppercase block mb-1.5">
                          Available Weights:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {item.availableWeightsKg.map((w) => (
                            <span
                              key={w}
                              className="px-2 py-0.5 bg-kaizen-bg border border-kaizen-border rounded text-[11px] font-mono text-kaizen-text"
                            >
                              {w} kg
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Barbell Plates */}
                    {item.platePairsKg && item.platePairsKg.length > 0 && (
                      <div className="mt-3">
                        <span className="text-[10px] font-mono text-kaizen-subtle uppercase block mb-1.5">
                          Plate Pairs (pairs of 2):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {item.platePairsKg.map((p) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 bg-amber-400/10 border border-amber-400/20 text-amber-300 rounded text-[11px] font-mono"
                            >
                              2 × {p} kg
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Working Weights & Overload History */}
      {activeTab === 'working-weights' && (
        <div className="space-y-4">
          <div className="p-3 bg-kaizen-surface/40 border border-kaizen-border rounded-control flex items-center justify-between text-xs text-kaizen-muted">
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-400" />
              Working weights automatically adapt when you log workouts or run daily adaptation checks.
            </span>
          </div>

          {workingWeights.length === 0 ? (
            <div className="p-8 text-center bg-kaizen-surface border border-kaizen-border rounded-structural">
              <TrendingUp className="w-8 h-8 text-kaizen-muted mx-auto mb-2 opacity-50" />
              <h4 className="text-sm font-bold text-kaizen-text">No Working Weights Logged Yet</h4>
              <p className="text-xs text-kaizen-muted mt-1 max-w-md mx-auto">
                Log your first workout or generate a personalized routine in the Planner. Your progressive overload loads will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {workingWeights.map((ww) => (
                <div
                  key={ww.exerciseName}
                  className="p-4 bg-kaizen-surface border border-kaizen-border rounded-structural space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-kaizen-text">{ww.exerciseName}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs font-mono text-kaizen-muted">
                        <span>Target: <strong className="text-kaizen-text">{ww.targetReps} reps</strong></span>
                        <span>•</span>
                        <span>Last Session: <strong className="text-kaizen-text">{ww.lastUsedDate}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-kaizen-subtle uppercase block">Current Working Load</span>
                        <span className="text-lg font-bold font-mono text-emerald-400">{ww.currentWeightKg} kg</span>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingExercise(ww.exerciseName);
                          setEditWeight(ww.currentWeightKg.toString());
                          setEditReps(ww.targetReps.toString());
                        }}
                        className="text-xs"
                      >
                        Adjust Load
                      </Button>
                    </div>
                  </div>

                  {/* Inline quick editor */}
                  {editingExercise === ww.exerciseName && (
                    <div className="p-3 bg-kaizen-bg border border-emerald-500/30 rounded-control grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                      <div>
                        <label className="text-[10px] font-mono text-kaizen-muted block mb-1">New Load (kg)</label>
                        <Input
                          type="number"
                          step="0.5"
                          value={editWeight}
                          onChange={(e) => setEditWeight(e.target.value)}
                          placeholder="e.g. 22.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-kaizen-muted block mb-1">Target Reps</label>
                        <Input
                          type="number"
                          value={editReps}
                          onChange={(e) => setEditReps(e.target.value)}
                          placeholder="e.g. 10"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-kaizen-muted block mb-1">Perceived RPE (1-10)</label>
                        <Input
                          type="number"
                          step="0.5"
                          value={editRpe}
                          onChange={(e) => setEditRpe(e.target.value)}
                          placeholder="e.g. 8"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingExercise(null)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSaveWorkingWeight(ww.exerciseName)}
                          className="text-xs"
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* History progression bar/pills */}
                  {ww.history && ww.history.length > 0 && (
                    <div className="pt-2 border-t border-kaizen-border/60">
                      <span className="text-[10px] font-mono text-kaizen-subtle uppercase tracking-wider block mb-1.5">
                        Recent Progression Logs
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {ww.history.slice(-5).map((h, i) => (
                          <div
                            key={i}
                            className="px-2 py-1 bg-kaizen-bg border border-kaizen-border rounded text-[11px] font-mono flex items-center gap-1.5"
                          >
                            <span className="text-kaizen-muted text-[10px]">{h.date}</span>
                            <span className="text-emerald-400 font-bold">{h.weightKg}kg</span>
                            <span className="text-kaizen-subtle text-[10px]">× {h.reps} reps</span>
                            {h.rpe && <span className="text-amber-400 text-[10px]">@{h.rpe}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
