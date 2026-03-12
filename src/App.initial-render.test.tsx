import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { storageService, type UserData } from './services/storageService';

vi.mock('./services/storageService', () => ({
  storageService: {
    getUserData: vi.fn(),
    saveUserData: vi.fn(),
    removeUserData: vi.fn(),
    isChromeStorageAvailable: vi.fn(() => false),
  },
}));

const mockedStorage = vi.mocked(storageService);

function populatedUserData(overrides: Partial<UserData> = {}): UserData {
  return {
    birthday: '1990-01-01',
    journals: {
      0: ['First journal entry', 'Second journal entry', 'Third journal entry'],
    },
    ...overrides,
  };
}

async function openJournalForWeek(weekIndex: number) {
  fireEvent.click(screen.getByTestId(`week-dot-${weekIndex}`));
  await screen.findByTestId('journal-section');
}

async function expectCoreRegions() {
  await waitFor(() => expect(screen.getByTestId('new-tab-content')).toBeInTheDocument());
  expect(screen.getByTestId('life-counter-region')).toBeVisible();
  expect(screen.getByTestId('quote-region')).toBeVisible();
  expect(screen.getByTestId('interactive-units-region')).toBeVisible();
  expect(screen.getByTestId('week-grid-region')).toBeVisible();
}

describe('App initial extension render', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedStorage.getUserData.mockReset();
    mockedStorage.saveUserData.mockReset();
    mockedStorage.removeUserData.mockReset();
    mockedStorage.isChromeStorageAvailable.mockReturnValue(false);
  });

  it('handles empty storage by showing onboarding, then renders the core new-tab UI after setup', async () => {
    mockedStorage.getUserData.mockResolvedValue(null);
    mockedStorage.saveUserData.mockResolvedValue(undefined);

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('onboarding-region')).toBeVisible());
    expect(screen.queryByTestId('new-tab-content')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('birthday-input'), {
      target: { value: '1990-01-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: /begin countdown/i }));

    await expectCoreRegions();
    await openJournalForWeek(0);
    expect(screen.getByTestId('journal-section')).toBeVisible();
  });

  it('renders all core regions immediately with pre-populated storage', async () => {
    mockedStorage.getUserData.mockResolvedValue(populatedUserData());

    render(<App />);

    await expectCoreRegions();
    await openJournalForWeek(0);

    expect(screen.getByTestId('journal-section')).toBeVisible();
    expect(screen.getAllByPlaceholderText("What's on your mind?")).toHaveLength(3);
  });

  it('tolerates partially missing optional journal data without fatal errors', async () => {
    mockedStorage.getUserData.mockResolvedValue(
      populatedUserData({
        journals: {
          0: ['Only one entry'] as unknown as string[],
        },
      }),
    );

    render(<App />);

    await expectCoreRegions();
    await openJournalForWeek(0);

    const textareas = screen.getAllByPlaceholderText("What's on your mind?") as HTMLTextAreaElement[];
    expect(textareas).toHaveLength(3);
    expect(textareas.every((textarea) => textarea.value === '')).toBe(true);
  });
});
