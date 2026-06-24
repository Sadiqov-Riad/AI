const API = "http://127.0.0.1:8000";

export  type PredictIn = {
    bedrooms: number;
    bathrooms: number;
    sqm: number;
    city: string;
}

export type HouseIn = PredictIn & {
    price_azn: number;
}

export async function addHouse(data: HouseIn) {
    const response = await fetch(`${API}/add-house`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<{ status: string; message: string }>;
}

export async function predict(data: PredictIn){
    const response =
        await fetch(`${API}/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data)
        });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<{priceAZN: number}>;
}

export async function retrainModel() {
    const response = await fetch(`${API}/retrain`, {
        method: "POST"
    });

    if (!response.ok) {
        throw new Error(`Retrain failed: HTTP ${response.status}`);
    }

    return response.json() as Promise<{ message: string; metrics: { mae: number; r2: number; dataset_size: number } }>;
}