import { readFTDCFile } from './ftdc_parser.js';

let debugPaneDiv;

const updateDebugPaneHTML = (newHTML) => {
    debugPaneDiv.innerHTML = newHTML;
};
const appendDebugPaneHTML = (newHTML) => {
    const h = debugPaneDiv.innerHTML;
    debugPaneDiv.innerHTML = h + (h ? "<br/>" : "") + newHTML;
};

const s3BucketName = "lfs-example-files-202503";
const s3BucketRegion = "ap-northeast-1";
const s3BucketUrl = `https://${s3BucketName}.s3.${s3BucketRegion}.amazonaws.com/`;

/**
 * Using https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html to list files in
 *   the bucket. Note this endpoint only works when the "s3:ListBucket" action is granted by bucket
 *   policy on the bucket.
 * AWS's underlying HTTP API is XML, so data is parsed and iterated here by ancient ways.
 */
const listBucketObjects = async (bucketUrl) => {
    const res = [];
    const fr = await fetch(`${bucketUrl}?list-type-2`);
    const tr = await fr.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(tr, "text/xml");
    const listBRElem = doc.documentElement; //The top-most element, <ListBucketResult>
    const objElems = listBRElem.getElementsByTagName("Contents");
    for (let i = 0; i < objElems.length; i++) {
        let o = objElems.item(i);
        res.push(o.getElementsByTagName("Key")[0].textContent);
    }
    return res;
};

const fetchFtdcAndDisplay = async (fpath) => {
    readFTDCFile(`${s3BucketUrl}${fpath}`);
    appendDebugPaneHTML(fpath + "<br/>" + "See console log output");
};

const dynamicContentSetup = async () => {

    const filesUlElem = document.createElement("ul");
    filesUlElem.id = "bucket_files_list";
    filesUlElem.innerHTML = `S3 bucket <strong>${s3BucketName}</strong> (${s3BucketRegion})`;
    document.body.append(filesUlElem);

    const bucketFilesList = await listBucketObjects(s3BucketUrl);
    if (!bucketFilesList || bucketFilesList.length === 0) {
        const errLiElem = document.createElement("li");
        errLiElem.innerText = "Ara! No files found in the bucket.";
        filesUlElem.append(errLiElem);
    }
    for (let i = 0; i < bucketFilesList.length; i++) {
        const liElem = document.createElement("li");
        liElem.innerHTML = `${bucketFilesList[i]} <button>Fetch it</button>`;
        filesUlElem.append(liElem);
        liElem.querySelector("button").addEventListener('click', async () => {
            fetchFtdcAndDisplay(bucketFilesList[i])
        });
    }

    debugPaneDiv = document.createElement("div");
    debugPaneDiv.id = "debug_pane";
    document.body.append(debugPaneDiv);
};

export {
    dynamicContentSetup,
};
