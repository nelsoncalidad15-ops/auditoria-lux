/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AuditSession } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Connection Test as required by Firebase Instructions
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

export async function getAudits() {
  try {
    const querySnapshot = await getDocs(collection(db, 'audits'));
    const audits: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Ensure date is processed or createdAt fallback is used
      audits.push({ 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt 
      });
    });
    return audits;
  } catch (error) {
    console.error("Error fetching audits:", error);
    return [];
  }
}

export async function saveAudit(session: AuditSession, score: number) {
  try {
    const auditData = {
      ...session,
      score,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'audits'), auditData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, 'write', 'audits');
  }
}

// Error handling as required by Firebase Instructions
export function handleFirestoreError(error: unknown, operationType: string, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
