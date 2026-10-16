import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import HealthCard from '../components/HealthCard';
import FeatureCards from '../components/FeatureCards';
import ArchitectureSection from '../components/ArchitectureSection';
import Footer from '../components/Footer';
import { checkHealth } from '../api/health.api';

export default function LandingPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkHealth();
      setHealthData(data);
    } catch (err) {
      console.error('Failed to query health endpoint:', err);
      setError(err);
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      <Navbar healthStatus={healthData} />
      
      <main className="flex-grow">
        <HeroSection />

        {/* Live Health Check Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <HealthCard
            healthData={healthData}
            loading={loading}
            error={error}
            onRefresh={fetchStatus}
          />
        </section>

        <FeatureCards />
        <ArchitectureSection />
      </main>

      <Footer />
    </div>
  );
}
