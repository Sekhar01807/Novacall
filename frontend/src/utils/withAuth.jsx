import React, { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { AuthContext } from "../contexts/AuthContext";

const withAuth = (WrappedComponent) => {
    const AuthComponent = (props) => {
        const router = useNavigate();
        const { userData, authLoading, isAuthenticated } = useContext(AuthContext);

        useEffect(() => {
            if (!authLoading && !isAuthenticated && !userData?.username) {
                router("/auth?mode=signin");
            }
        }, [authLoading, isAuthenticated, userData, router]);

        if (authLoading) {
            return (
                <Box sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "#0F172A"
                }}>
                    <CircularProgress sx={{ color: "#3B82F6" }} />
                </Box>
            );
        }

        if (!isAuthenticated && !userData?.username) {
            return null;
        }

        return React.createElement(WrappedComponent, props);
    };

    return AuthComponent;
};

export default withAuth;