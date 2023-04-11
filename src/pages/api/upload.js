// pages/api/upload.js
import nextConnect from 'next-connect';
import multer from 'multer';
import XLSX from 'xlsx';
import { MongoClient } from 'mongodb';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only Excel files with .xls or .xlsx extensions are allowed.'
      ),
      false
    );
  }
};

const upload = multer({ storage, fileFilter });

const readSheetFromFileBuffer = (fileBuffer) => {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
};

const handler = nextConnect()
  .use(upload.single('file'))
  .post(async (req, res) => {
    const data = readSheetFromFileBuffer(req.file.buffer);

    const mappedData = data.map((item) => ({
      name: item[req.body.name],
      price: parseFloat(item[req.body.price]),
      quantity: parseInt(item[req.body.quantity], 10),
    }));
    try {
      // const client = await mongoClient();
      const mongoClient = new MongoClient(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      const res = await mongoClient
        .db()
        .collection('products')
        .insertMany(mappedData);
      res.status(200).json(res);
    } catch (error) {
      console.log('error from mongo', error);
    }

    res.status(200).json(mappedData);
  });

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
};

export default handler;
