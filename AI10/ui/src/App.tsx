import './App.css'
import {predict, addHouse, type PredictIn, retrainModel} from "./api"
import { cities } from "./cities"
import { useState } from "react";

type Tab = 'predict' | 'add';

function App() {
    const [activeTab, setActiveTab] = useState<Tab>('predict');

    const [predictData, setPredictData] = useState<PredictIn>({
        bedrooms: 0,
        bathrooms: 0,
        sqm: 0,
        city: ''
    });
    const [priceAZN, setPriceAZN] = useState<number | null>(null);

    const [houseData, setHouseData] = useState({
        bedrooms: 0,
        bathrooms: 0,
        sqm: 0,
        city: '',
        price_azn: 0
    });
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Общие стейты статуса
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Хендлер отправки формы предсказания
    const handlePredictSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setPriceAZN(null);
        try {
            const result = await predict(predictData);
            setPriceAZN(result.priceAZN)
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred.");
        } finally {
            setLoading(false);
        }
    }

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            await addHouse(houseData);

            setSuccessMessage("House saved. Retraining AI model...");
            const retrainResult = await retrainModel()

            setSuccessMessage(`${retrainResult.message} (Dataset: ${retrainResult.metrics.dataset_size} houses, R2: ${retrainResult.metrics.r2})`)

            setHouseData({ bedrooms: 0, bathrooms: 0, sqm: 0, city: '', price_azn: 0 });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add house.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="app">
            <div className="container">
                <div className="tabs">
                    <button
                        className={`tab-button ${activeTab === 'predict' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('predict'); setError(null); }}
                    >
                        Predict Price
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'add' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('add'); setError(null); }}
                    >
                        Add House
                    </button>
                </div>

                {activeTab === 'predict' && (
                    <>
                        <form className='form' onSubmit={handlePredictSubmit}>
                            <div className="form-group">
                                <label htmlFor="bedrooms">Bedrooms</label>
                                <input
                                    type="number"
                                    id="bedrooms"
                                    value={predictData.bedrooms}
                                    min="0"
                                    onChange={(e) => setPredictData(p => ({ ...p, bedrooms: Number(e.target.value) }))}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="bathrooms">Bathrooms</label>
                                <input
                                    type="number"
                                    id="bathrooms"
                                    value={predictData.bathrooms}
                                    min="0"
                                    onChange={(e) => setPredictData(p => ({ ...p, bathrooms: Number(e.target.value) }))}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="sqm">Square meters</label>
                                <input
                                    type="number"
                                    id="sqm"
                                    value={predictData.sqm}
                                    min="0"
                                    step="0.01"
                                    onChange={(e) => setPredictData(p => ({ ...p, sqm: Number(e.target.value) }))}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="city">City</label>
                                <select
                                    id="city"
                                    value={predictData.city}
                                    onChange={(e) => setPredictData(p => ({ ...p, city: e.target.value }))}
                                    required
                                >
                                    <option value="">Select...</option>
                                    {cities.map((city) => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>

                            <button type="submit" className="submit-button" disabled={loading}>
                                {loading ? "Predicting..." : "Predict Price"}
                            </button>
                        </form>

                        {priceAZN !== null && (
                            <div className="result">
                                <h2>
                                    Predicted Price
                                    <span className="price-tag">
                                        {Intl.NumberFormat("az-AZ", { style: "currency", currency: "AZN" }).format(priceAZN)}
                                    </span>
                                </h2>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'add' && (
                    <>
                        <form className='form' onSubmit={handleAddSubmit}>
                            <div className="form-group">
                                <label htmlFor="add-bedrooms">Bedrooms</label>
                                <input
                                    type="number"
                                    id="add-bedrooms"
                                    value={houseData.bedrooms}
                                    min="0"
                                    onChange={(e) => setHouseData(p => ({ ...p, bedrooms: Number(e.target.value) }))}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="add-bathrooms">Bathrooms</label>
                                <input
                                    type="number"
                                    id="add-bathrooms"
                                    value={houseData.bathrooms}
                                    min="0"
                                    onChange={(e) => setHouseData(p => ({ ...p, bathrooms: Number(e.target.value) }))}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="add-sqm">Square meters</label>
                                <input
                                    type="number"
                                    id="add-sqm"
                                    value={houseData.sqm}
                                    min="0"
                                    step="0.01"
                                    onChange={(e) => setHouseData(p => ({ ...p, sqm: Number(e.target.value) }))}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="add-city">City</label>
                                <select
                                    id="add-city"
                                    value={houseData.city}
                                    onChange={(e) => setHouseData(p => ({ ...p, city: e.target.value }))}
                                    required
                                >
                                    <option value="">Select...</option>
                                    {cities.map((city) => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="add-price">Actual Price (AZN)</label>
                                <input
                                    type="number"
                                    id="add-price"
                                    value={houseData.price_azn}
                                    min="0"
                                    onChange={(e) => setHouseData(p => ({ ...p, price_azn: Number(e.target.value) }))}
                                    required
                                />
                            </div>

                            <button type="submit" className="submit-button" disabled={loading}>
                                {loading ? "Saving..." : "Add to Dataset"}
                            </button>
                        </form>

                        {successMessage && <div className="success">{successMessage}</div>}
                    </>
                )}

                {error && <div className="error">{error}</div>}
            </div>
        </div>
    )
}

export default App;