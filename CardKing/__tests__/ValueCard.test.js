import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ValueCard from '../components/common/ValueCard';

import { getLatestScans } from '../components/services/RetrieveScans';
import { AnalyzeCard } from '../components/services/AnalyzeCard';
import { extractCardInfo } from '../components/services/ExtractCardInfo';
import { extractPokemonCardInfo } from '../components/services/ExtractPokemonCardInfo';
import { getCardPrice, getPokemonCardPrice } from '../components/services/GetCardPrice';
import { lookupCardFromWebMatches } from '../components/services/CardLookupService';

jest.mock('../components/services/RetrieveScans');
jest.mock('../components/services/AnalyzeCard');
jest.mock('../components/services/ExtractCardInfo');
jest.mock('../components/services/ExtractPokemonCardInfo');

jest.mock('../components/services/GetCardPrice', () => ({
    getCardPrice: jest.fn(),
    getPokemonCardPrice: jest.fn(),
}));

jest.mock('../components/services/CardLookupService');

jest.mock('../components/services/AddToCollection', () => ({
    AddToCollection: jest.fn(),
}));

jest.mock('../components/services/AddToCollectionPokemon', () => ({
    AddToCollectionPokemon: jest.fn(),
}));

jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('expo-image-manipulator', () => ({
    manipulateAsync: jest.fn(() =>
        Promise.resolve({ uri: 'processed.jpg' })
    ),
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

describe('ValueCard', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('fetches and displays sports card price', async () => {
        getLatestScans.mockResolvedValue({
            frontUrl: 'front.jpg',
            backUrl: 'back.jpg',
        });

        AnalyzeCard.mockResolvedValue({
            front: { textAnnotations: [{ description: 'LeBron James 2020' }] },
            back: {},
        });

        extractCardInfo.mockReturnValue({
            name: 'LeBron James',
            year: '2003',
            manufacturer: 'Topps',
            cardNumber: '221',
        });

        lookupCardFromWebMatches.mockResolvedValue({
            searchQuery: 'LeBron James 2003 Topps 221',
        });

        getCardPrice.mockResolvedValue({
            average: 100.5,
            displayValue: 100.5,
            confidence: 90,
            sampleSize: 5,
        });

        const { getByText } = render(<ValueCard />);

        await waitFor(() => {
        expect(getByText('$100.50')).toBeTruthy();
        });

        expect(getCardPrice).toHaveBeenCalled();
    });

    test('fetches and displays Pokemon card price', async () => {

        getLatestScans.mockResolvedValue({
            frontUrl: 'front.jpg',
            backUrl: 'back.jpg',
        });

        AnalyzeCard.mockResolvedValue({
            front: {
            textAnnotations: [
                { description: 'Pikachu HP 40 Pokémon' }
                ],
            },
            back: {},
        });

        extractPokemonCardInfo.mockReturnValue({
            name: 'Pikachu',
            set: 'Base Set',
            year: '1999',
            cardNumber: '58/102',
            fullText: 'Pikachu Pokémon card 1999',
        });

        lookupCardFromWebMatches.mockResolvedValue({
            searchQuery: '1999 Pikachu Base Set 58/102 Pokemon Card',
        });

        getPokemonCardPrice.mockResolvedValue({
            average: 15.0,
            displayValue: 15.0,
            confidence: 95,
            sampleSize: 10,
        });

        const { getByText } = render(<ValueCard />);

        await waitFor(() => {
            expect(getByText('Pokémon Card Details')).toBeTruthy();
        });

        expect(getByText('Pikachu')).toBeTruthy();
        expect(getByText('Base Set')).toBeTruthy();
        expect(getByText('1999')).toBeTruthy();
        expect(getByText('$15.00')).toBeTruthy();

        expect(getPokemonCardPrice).toHaveBeenCalled();
    });

    test('shows "Market price unavailable" when no price data is returned', async () => {

        getLatestScans.mockResolvedValue({
            frontUrl: 'front.jpg',
            backUrl: 'back.jpg',
        });
  
        AnalyzeCard.mockResolvedValue({
            front: { textAnnotations: [{ description: 'LeBron James 2026' }] },
            back: {},
        });
  
        extractCardInfo.mockReturnValue({
            name: 'LeBron James',
            year: '2026',
            manufacturer: 'Topps',
            cardNumber: '1',
        });
  
        lookupCardFromWebMatches.mockResolvedValue({
            searchQuery: 'LeBron James 2026 Topps 1',
        });

        getCardPrice.mockResolvedValue({
            average: null,
            median: null,
            confidence: 90,
            sampleSize: 0,
        });
  
        const { getByText } = render(<ValueCard />);
  
        await waitFor(() => {
            expect(getByText('Market price unavailable')).toBeTruthy();
        });
    });

    test('shows "Insufficient sales data" when price confidence is below 30', async () => {

        getLatestScans.mockResolvedValue({
            frontUrl: 'front.jpg',
            backUrl: 'back.jpg',
        });

        AnalyzeCard.mockResolvedValue({
            front: { textAnnotations: [{ description: 'LeBron James 2026' }] },
            back: {},
        });

        extractCardInfo.mockReturnValue({
            name: 'LeBron James',
            year: '2026',
            manufacturer: 'Topps',
            cardNumber: '1',
        });

        lookupCardFromWebMatches.mockResolvedValue({
            searchQuery: 'LeBron James 2026 Topps 1',
        });
  
        getCardPrice.mockResolvedValue({
            average: 25.5,
            displayValue: 25.5,
            confidence: 10,
            sampleSize: 2,
        });

        const { getByText } = render(<ValueCard />);

        await waitFor(() => {
            expect(getByText('Insufficient sales data')).toBeTruthy();
        });
    });
});