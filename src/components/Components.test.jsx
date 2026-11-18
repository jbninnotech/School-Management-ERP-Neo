import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TimePicker from '../components/TimePicker.jsx';
import CascadingCategorySelector from '../components/CascadingCategorySelector.jsx';
import categoryService from '../services/categoryService.js';

describe('TimePicker Component (12-hour AM/PM)', () => {
  it('renders hour, minute, and AM/PM select controls', () => {
    const onChange = vi.fn();
    render(<TimePicker value="10:30 AM" onChange={onChange} />);

    expect(screen.getByTestId('timepicker-hour')).toHaveValue('10');
    expect(screen.getByTestId('timepicker-minute')).toHaveValue('30');
    expect(screen.getByTestId('timepicker-period')).toHaveValue('AM');
  });

  it('triggers onChange when hour or period changes', () => {
    const onChange = vi.fn();
    render(<TimePicker value="10:30 AM" onChange={onChange} />);

    fireEvent.change(screen.getByTestId('timepicker-hour'), { target: { value: '11' } });
    expect(onChange).toHaveBeenCalledWith('11:30 AM');

    fireEvent.change(screen.getByTestId('timepicker-period'), { target: { value: 'PM' } });
    expect(onChange).toHaveBeenCalledWith('10:30 PM');
  });
});

describe('CascadingCategorySelector Component', () => {
  it('renders Unit selector enabled and lower levels disabled until parent selected', async () => {
    vi.spyOn(categoryService, 'getCascading').mockResolvedValue({
      success: true,
      data: [{ _id: 'cat_unit_1', name: 'Unit 1: Algebra', level: 'unit' }],
    });

    const onChange = vi.fn();
    render(
      <CascadingCategorySelector
        subject="Mathematics"
        classGrade="Class 10"
        unitId=""
        topicId=""
        subTopicId=""
        childTopicId=""
        onChange={onChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('category-select-unit')).toBeEnabled();
    });
    expect(screen.getByTestId('category-select-topic')).toBeDisabled();
    expect(screen.getByTestId('category-select-subtopic')).toBeDisabled();
    expect(screen.getByTestId('category-select-child')).toBeDisabled();
  });
});
