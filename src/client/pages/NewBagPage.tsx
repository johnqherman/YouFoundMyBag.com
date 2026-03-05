import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import CreateBagForm from '../components/CreateBagForm.js';
import BagCreated from '../components/BagCreated.js';
import type { CreateBagResponse } from '../types/index.js';
import { api } from '../utils/api.js';

export default function NewBagPage() {
  const [createdBag, setCreatedBag] = useState<CreateBagResponse | null>(null);
  const [isPro, setIsPro] = useState(false);

  const handleBagCreated = async (bagData: CreateBagResponse) => {
    const token = localStorage.getItem('owner_session_token');
    if (token) {
      try {
        const planResult = await api.getPlan(token);
        setIsPro(planResult.data.plan === 'pro');
      } catch {
        setIsPro(false);
      }
    } else {
      setIsPro(false);
    }
    setCreatedBag(bagData);
  };

  if (createdBag) {
    return (
      <BagCreated
        bagData={createdBag}
        onCreateAnother={() => setCreatedBag(null)}
        isPro={isPro}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-regal-navy-50 text-regal-navy-900">
      <Helmet>
        <title>Create New Bag - YouFoundMyBag.com</title>
      </Helmet>
      <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto p-4 sm:p-6 w-full 2xl:[zoom:1.25]">
        <main>
          <CreateBagForm onSuccess={handleBagCreated} />
        </main>
      </div>
    </div>
  );
}
