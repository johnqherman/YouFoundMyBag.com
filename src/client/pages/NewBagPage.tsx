import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import CreateBagForm from '../components/CreateBagForm.js';
import BagCreated from '../components/BagCreated.js';
import type { CreateBagResponse } from '../types/index.js';

export default function NewBagPage() {
  const [createdBag, setCreatedBag] = useState<CreateBagResponse | null>(null);

  if (createdBag) {
    return (
      <BagCreated
        bagData={createdBag}
        onCreateAnother={() => setCreatedBag(null)}
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
          <CreateBagForm onSuccess={setCreatedBag} />
        </main>
      </div>
    </div>
  );
}
