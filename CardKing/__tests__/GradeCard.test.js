import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import GradeCard from '../components/common/GradeCard';
import { getLatestScans } from '../components/services/RetrieveScans';
import { AnalyzeCard } from '../components/services/AnalyzeCard';
import { extractCardInfo } from '../components/services/ExtractCardInfo';
import { extractPokemonCardInfo } from '../components/services/ExtractPokemonCardInfo';
import { lookupCardFromWebMatches } from '../components/services/CardLookupService';
import { gradeCard } from '../components/services/GradeCardService';
import { AddToCollection } from '../components/services/AddToCollection';
import { AddToCollectionPokemon } from '../components/services/AddToCollectionPokemon';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));
  
jest.mock('../components/services/RetrieveScans', () => ({
    getLatestScans: jest.fn(),
}));
  
jest.mock('../components/services/AnalyzeCard', () => ({
    AnalyzeCard: jest.fn(),
}));
  
jest.mock('../components/services/ExtractCardInfo', () => ({
    extractCardInfo: jest.fn(),
}));
  
jest.mock('../components/services/ExtractPokemonCardInfo', () => ({
    extractPokemonCardInfo: jest.fn(),
}));
  
jest.mock('../components/services/CardLookupService', () => ({
    lookupCardFromWebMatches: jest.fn(),
    buildAccurateSearchQuery: jest.fn(),
}));
  
jest.mock('../components/services/GradeCardService', () => ({
    gradeCard: jest.fn(),
}));

jest.mock('../components/config/FireBase', () => ({
    db: {},
}));

jest.mock('firebase/app', () => ({
    initializeApp: jest.fn(),
    getApps: jest.fn(() => []),
}));
  
jest.mock('firebase/firestore', () => ({
    getDoc: jest.fn(),
    doc: jest.fn(),
}));

jest.mock('../components/services/AddToCollection', () => ({
    AddToCollection: jest.fn(),
}));
  
jest.mock('../components/services/AddToCollectionPokemon', () => ({
    AddToCollectionPokemon: jest.fn(),
}));

describe('GradeCard: UI Information matches Information on Card Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders correct sports card information', async () => {
        getLatestScans.mockResolvedValue({
            frontUrl: 'front.jpg',
            backUrl: 'back.jpg',
        });

        AnalyzeCard.mockResolvedValue({
            front: {},
            back: {},
        });

        extractCardInfo.mockReturnValue({
            name: 'LeBron James',
            year: '2003',
            manufacturer: 'Topps',
            cardNumber: '221',
            rookie: true,
            autograph: false,
            relic: false,
        });

        lookupCardFromWebMatches.mockResolvedValue({
            searchQuery: 'LeBron James 2003 Topps',
        });
  
        gradeCard.mockResolvedValue({
            grade: 9.5,
            subgrades: {
                centering: 9,
                corners: 10,
                edges: 9,
                surface: 9.5,
            },
        });
  
        const { getByText, findByTestId } = render(<GradeCard></GradeCard>);

        await waitFor(() => {
            expect(getByText('Card Details')).toBeTruthy();
        });

        await waitFor(() => {
            expect(getByText('LeBron James')).toBeTruthy();      
        })

        const grade = await findByTestId('main-grade');

        expect(grade.props.children).toBe('9.5');

        expect(getByText('2003')).toBeTruthy();
        expect(getByText('Topps')).toBeTruthy();
        expect(getByText('221')).toBeTruthy();
    });
  
    test('renders correct pokemon card information', async () => {
        getLatestScans.mockResolvedValue({
            frontUrl: 'front.jpg',
            backUrl: 'back.jpg',
        });

        AnalyzeCard.mockResolvedValue({
            front: {
            textAnnotations: [{ description: 'POKEMON CARD PIKACHU' }],
            },
            back: {},
        });

        extractPokemonCardInfo.mockReturnValue({
            name: 'Pikachu',
            set: 'Base Set',
            year: '1999',
            cardNumber: '58/102',
        });

        lookupCardFromWebMatches.mockResolvedValue({
            searchQuery: 'Pikachu 1999 Base Set',
        });

        gradeCard.mockResolvedValue({
            grade: 8.0,
        });

        const { getByText } = render(<GradeCard></GradeCard>);

        await waitFor(() => {
            expect(getByText('Pokémon Card Details')).toBeTruthy();
        });

        expect(getByText('Pikachu')).toBeTruthy();
        expect(getByText('1999')).toBeTruthy();
        expect(getByText('Base Set')).toBeTruthy();
        expect(getByText('58/102')).toBeTruthy();
        });
    });

describe('GradeCard: Button UI Tests', () => {
    test('renders ebay button', async () => {
        const { getByTestId, getByText} = render(<GradeCard></GradeCard>)

        await waitFor(() => {
            expect(getByText('Card Information')).toBeTruthy();
        });

        expect(getByTestId('ebay-button')).toBeTruthy();
    }),
    test('renders collections button', async () => {
        const { getByTestId, getByText} = render(<GradeCard></GradeCard>)
        await waitFor(() => {
            expect(getByText('Card Information')).toBeTruthy();
        });

        expect(getByTestId('collections-button')).toBeTruthy();

    }),
    test('renders home button', async () => {
        const { getByTestId, getByText} = render(<GradeCard></GradeCard>)
        await waitFor(() => {
            expect(getByText('Card Information')).toBeTruthy();
        });

        expect(getByTestId('home-button')).toBeTruthy();

    }),
    test('renders rotate button', async () => {
        const { getByTestId, getByText} = render(<GradeCard></GradeCard>)
        await waitFor(() => {
            expect(getByText('Card Information')).toBeTruthy();
        });

        expect(getByTestId('rotate-button')).toBeTruthy();

    }),
    test('renders zoom button', async () => {
        const { getByTestId, getByText} = render(<GradeCard></GradeCard>)
        await waitFor(() => {
            expect(getByText('Card Information')).toBeTruthy();
        });

        expect(getByTestId('zoom-button')).toBeTruthy();

    })
})

describe('GradeCard: Grade Added to Collection Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('adds sports card with correct grade', async () => {
        getLatestScans.mockResolvedValue({
            frontUrl: 'front.jpg',
            backUrl: 'back.jpg',
        });

        AnalyzeCard.mockResolvedValue({
            front: {},
            back: {},
        });

        extractCardInfo.mockReturnValue({
            name: 'LeBron James',
            year: '2003',
            manufacturer: 'Topps',
            cardNumber: '221',
        });

        lookupCardFromWebMatches.mockResolvedValue({
            searchQuery: 'LeBron James 2003',
        });

        gradeCard.mockResolvedValue({
            grade: 9.5,
        });

        const { getByTestId, getByText } = render(<GradeCard></GradeCard>);

        await waitFor(() => {
            expect(getByText('LeBron James')).toBeTruthy();
        });

        await waitFor(() => {
            expect(gradeCard).toHaveBeenCalled();
        });

        fireEvent.press(getByTestId('collections-button'));

        expect(AddToCollection).toHaveBeenCalledWith(
            'LeBron James',
            '2003',
            'Topps',
            '221',
            'front.jpg',
            null,
            9.5
        );

        expect(mockPush).toHaveBeenCalledWith('./collection');
    }),
    test('adds pokemon card with correct grade', async () => {
        getLatestScans.mockResolvedValue({
            frontUrl: 'front.jpg',
            backUrl: 'back.jpg',
        });

        AnalyzeCard.mockResolvedValue({
            front: {
                textAnnotations: [{ description: 'POKEMON PIKACHU' }],
            },
            back: {},
        });

        extractPokemonCardInfo.mockReturnValue({
            name: 'Pikachu',
            set: 'Base Set',
            year: '1999',
            cardNumber: '58/102',
        });

        lookupCardFromWebMatches.mockResolvedValue({
            searchQuery: 'Pikachu 1999',
        });

        gradeCard.mockResolvedValue({
            grade: 8.0,
        });

        const { getByTestId, getByText } = render(<GradeCard></GradeCard>);

        await waitFor(() => {
            expect(getByText('Pikachu')).toBeTruthy();
        });

        fireEvent.press(getByTestId('collections-button'));

        expect(AddToCollectionPokemon).toHaveBeenCalledWith(
            'Pikachu',
            '1999',
            'Pokémon',
            '58/102',
            'front.jpg',
            null,
            8.0
        );
    });
});