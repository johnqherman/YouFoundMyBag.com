import { useState } from 'react';
import CreateBagForm from '../components/CreateBagForm';
import BagCreated from '../components/BagCreated';
import type { CreateBagResponse } from '../types';

export default function HomePage() {
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="max-w-readable mx-auto p-6">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">YouFoundMyBag</h1>
          <p className="text-neutral-300 text-lg">
            Protect your belongings with smart recovery tags.
          </p>
          <p className="text-neutral-400 mt-2">
            Create a QR code for your bags, backpacks, and valuables. If someone
            finds them, they can contact you safely without seeing your personal
            info.
          </p>
        </header>

        <main>
          <CreateBagForm onSuccess={setCreatedBag} />
        </main>

        <footer className="text-center mt-12 text-neutral-500 text-sm">
          <p>Privacy-first • No tracking • Open source</p>
        </footer>
      </div>
    </div>
  );
}
