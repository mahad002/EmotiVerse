import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  type FirestoreError
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Firestore Controller - Provides CRUD operations and common Firestore utilities
 */
class FirestoreController {
  /**
   * Get a single document by ID
   * @param collectionName - Name of the collection
   * @param docId - Document ID
   * @returns Document data or null if not found
   */
  async getDocument<T = DocumentData>(
    collectionName: string,
    docId: string
  ): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error(`Error getting document from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get all documents from a collection
   * @param collectionName - Name of the collection
   * @param constraints - Optional query constraints (where, orderBy, limit, etc.)
   * @returns Array of documents
   */
  async getDocuments<T = DocumentData>(
    collectionName: string,
    constraints?: QueryConstraint[]
  ): Promise<T[]> {
    try {
      const collectionRef = collection(db, collectionName);
      const q = constraints ? query(collectionRef, ...constraints) : collectionRef;
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
    } catch (error) {
      console.error(`Error getting documents from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Create a new document with auto-generated ID
   * @param collectionName - Name of the collection
   * @param data - Document data
   * @returns The ID of the created document
   */
  async createDocument(
    collectionName: string,
    data: DocumentData
  ): Promise<string> {
    try {
      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Create or update a document with a specific ID
   * @param collectionName - Name of the collection
   * @param docId - Document ID
   * @param data - Document data
   * @param merge - If true, merge with existing document; if false, overwrite
   */
  async setDocument(
    collectionName: string,
    docId: string,
    data: DocumentData,
    merge: boolean = false
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      await setDoc(
        docRef,
        {
          ...data,
          updatedAt: Timestamp.now(),
        },
        { merge }
      );
    } catch (error) {
      console.error(`Error setting document in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing document
   * @param collectionName - Name of the collection
   * @param docId - Document ID
   * @param data - Fields to update
   */
  async updateDocument(
    collectionName: string,
    docId: string,
    data: Partial<DocumentData>
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document
   * @param collectionName - Name of the collection
   * @param docId - Document ID
   */
  async deleteDocument(
    collectionName: string,
    docId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Query documents with where clause
   * @param collectionName - Name of the collection
   * @param field - Field to filter by
   * @param operator - Comparison operator (==, !=, <, <=, >, >=, array-contains, etc.)
   * @param value - Value to compare against
   * @param additionalConstraints - Additional query constraints
   * @returns Array of matching documents
   */
  async queryDocuments<T = DocumentData>(
    collectionName: string,
    field: string,
    operator: "<" | "<=" | "==" | "!=" | ">=" | ">" | "array-contains" | "in" | "array-contains-any",
    value: any,
    ...additionalConstraints: QueryConstraint[]
  ): Promise<T[]> {
    try {
      const collectionRef = collection(db, collectionName);
      const q = query(
        collectionRef,
        where(field, operator, value),
        ...additionalConstraints
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
    } catch (error) {
      console.error(`Error querying documents from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get documents ordered by a field
   * @param collectionName - Name of the collection
   * @param field - Field to order by
   * @param direction - "asc" or "desc"
   * @param limitCount - Optional limit on number of results
   * @returns Array of ordered documents
   */
  async getOrderedDocuments<T = DocumentData>(
    collectionName: string,
    field: string,
    direction: "asc" | "desc" = "asc",
    limitCount?: number
  ): Promise<T[]> {
    try {
      const constraints: QueryConstraint[] = [orderBy(field, direction)];
      if (limitCount) {
        constraints.push(limit(limitCount));
      }
      return this.getDocuments<T>(collectionName, constraints);
    } catch (error) {
      console.error(`Error getting ordered documents from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Check if a document exists
   * @param collectionName - Name of the collection
   * @param docId - Document ID
   * @returns True if document exists, false otherwise
   */
  async documentExists(
    collectionName: string,
    docId: string
  ): Promise<boolean> {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error(`Error checking document existence in ${collectionName}:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const firestoreController = new FirestoreController();

// Export the class for custom instances if needed
export default FirestoreController;

// Re-export commonly used Firestore utilities
export {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  type FirestoreError,
};
