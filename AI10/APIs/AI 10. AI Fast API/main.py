import traceback
import joblib
import pandas as pd
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from xgboost import XGBRegressor

app = FastAPI(title="Price Prediction AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = Path("../../models/model_az.pkl")
DATA_PATH = Path("../../data/housing_az_sqm_azn.csv")

numeric_features = ["Bedrooms", "Bathrooms", "Sqm"]
numeric_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler())
])

categorical_features = ["City"]
categorical_transformer = Pipeline(steps=[
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
])

preprocessor = ColumnTransformer(
    transformers=[
        ("num", numeric_transformer, numeric_features),
        ("cat", categorical_transformer, categorical_features)
    ]
)

try:
    loaded = joblib.load(MODEL_PATH)
    if isinstance(loaded, dict) and "pipeline" in loaded:
        BUNDLE = loaded
        PIPELINE = BUNDLE["pipeline"]
        FEATURES = BUNDLE.get("featured_order", ["Bedrooms", "Bathrooms", "Sqm", "City"])
    print(f"Model loaded successfully {MODEL_PATH}")
except Exception as e:
    print(f"Error loading model: {e}")
    traceback.print_exc()
    BUNDLE = None
    PIPELINE = None
    FEATURES = ["Bedrooms", "Bathrooms", "Sqm", "City"]

class PredictIn(BaseModel):
    bedrooms: float
    bathrooms: float
    sqm: float
    city: str

class NewHouseIn(BaseModel):
    bedrooms: float
    bathrooms: float
    sqm: float
    city: str
    price_azn: float

@app.post("/add-house")
async def add_house(request: NewHouseIn):
    try:
        new_data = pd.DataFrame([{
            "PriceAZN": request.price_azn,
            "Bedrooms": request.bedrooms,
            "Bathrooms": request.bathrooms,
            "Sqm": request.sqm,
            "City": request.city,
        }])

        if DATA_PATH.exists():
            new_data.to_csv(DATA_PATH, mode="a", header=False, index=False)
        else:
            new_data.to_csv(DATA_PATH, index=False)

        return {"message": "House added to dataset successfully"}
    except Exception as e:
        print(f"Error adding house: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to save data: {e}")

@app.post("/predict")
async def predict(request: PredictIn):
    if PIPELINE is None:
        raise HTTPException(status_code=503, detail="No model loaded")
    try:
        features = {
            "Bedrooms": [request.bedrooms],
            "Bathrooms": [request.bathrooms],
            "City": [request.city]
        }
        if "Sqm" in FEATURES:
            features["Sqm"] = [request.sqm]
        features_df = pd.DataFrame(features, columns=FEATURES)
        prediction = PIPELINE.predict(features_df)[0]
        return {"priceAZN": float(prediction)}
    except Exception as e:
        print(f"Error predicting price: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error predicting price: {e}")

@app.post("/retrain")
async def retrain():
    if not DATA_PATH.exists():
        raise HTTPException(status_code=404, detail="Dataset file not found")

    try:
        df = pd.read_csv(DATA_PATH)

        if len(df) < 10:
            raise HTTPException(status_code=400, detail="Not enough data to retrain model (min 10)")

        y = df["PriceAZN"].astype(float)
        X = df[["Bedrooms", "Bathrooms", "Sqm", "City"]]

        X = X.astype({
            "Bedrooms": float,
            "Bathrooms": float,
            "Sqm": float,
            "City": str
        })

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        xgb_model = XGBRegressor(
            n_estimators=1000,
            learning_rate=0.01,
            max_depth=5,
            subsample=0.8,
            random_state=42,
            n_jobs=-1
        )

        new_pipe = Pipeline(steps=[
            ("prep", preprocessor),
            ("model", xgb_model)
        ])

        new_pipe.fit(X_train, y_train)

        preds = new_pipe.predict(X_test)
        mae = mean_absolute_error(y_test, preds)
        r2 = r2_score(y_test, preds)

        global PIPELINE, BUNDLE

        BUNDLE = {
            "pipeline": new_pipe,
            "featured_order": ["Bedrooms", "Bathrooms", "Sqm", "City"],
        }
        PIPELINE = new_pipe

        joblib.dump(BUNDLE, MODEL_PATH)

        return {
            "message": "Model retrained successfully!",
            "metrics": {
                "mae": round(float(mae), 2),
                "r2": round(float(r2), 2),
                "dataset_size": len(df)
            }
        }
    except Exception as e:
        print(f"Error retraining model: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Retraining error: {e}")